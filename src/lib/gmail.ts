import { google } from "googleapis";

export function getGmailClient(accessToken: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.gmail({ version: "v1", auth });
}

export interface SenderInfo {
  email: string;
  name: string;
  count: number;
  messageIds: string[];
}

export interface CategoryInfo {
  label: string;
  description: string;
  query: string;
  count: number;
  messageIds: string[];
}

async function getAllMessageIds(
  gmail: ReturnType<typeof getGmailClient>,
  query: string
): Promise<string[]> {
  const ids: string[] = [];
  let pageToken: string | undefined;

  while (true) {
    const list = await gmail.users.messages.list({
      userId: "me",
      maxResults: 500,
      pageToken,
      q: query,
    });

    const messages = list.data.messages || [];
    ids.push(...messages.map((m) => m.id!));

    pageToken = list.data.nextPageToken ?? undefined;
    if (!pageToken || messages.length === 0) break;
  }

  return ids;
}

export async function getTopSenders(
  accessToken: string,
  scanSize = 500
): Promise<SenderInfo[]> {
  const gmail = getGmailClient(accessToken);
  const senderMap = new Map<string, { email: string; name: string }>();

  // Step 1: Quick scan to discover sender addresses
  let pageToken: string | undefined;
  let fetched = 0;

  while (fetched < scanSize) {
    const batchSize = Math.min(100, scanSize - fetched);
    const list = await gmail.users.messages.list({
      userId: "me",
      maxResults: batchSize,
      pageToken,
      q: "in:inbox",
    });

    const messages = list.data.messages || [];
    if (messages.length === 0) break;

    const details = await Promise.all(
      messages.map((msg) =>
        gmail.users.messages.get({
          userId: "me",
          id: msg.id!,
          format: "metadata",
          metadataHeaders: ["From"],
        })
      )
    );

    for (const detail of details) {
      const fromHeader = detail.data.payload?.headers?.find(
        (h) => h.name === "From"
      );
      if (!fromHeader?.value) continue;

      const parsed = parseFromHeader(fromHeader.value);
      const key = parsed.email.toLowerCase();
      if (!senderMap.has(key)) {
        senderMap.set(key, {
          email: parsed.email,
          name: parsed.name || parsed.email,
        });
      }
    }

    fetched += messages.length;
    pageToken = list.data.nextPageToken ?? undefined;
    if (!pageToken) break;
  }

  // Step 2: For each discovered sender, fetch ALL their message IDs
  const senders: SenderInfo[] = await Promise.all(
    Array.from(senderMap.values()).map(async ({ email, name }) => {
      const messageIds = await getAllMessageIds(
        gmail,
        `from:${email} in:inbox`
      );
      return { email, name, count: messageIds.length, messageIds };
    })
  );

  return senders.filter((s) => s.count > 0).sort((a, b) => b.count - a.count);
}

export async function getCategoryMessages(
  accessToken: string
): Promise<CategoryInfo[]> {
  const gmail = getGmailClient(accessToken);

  const categories: CategoryInfo[] = [
    {
      label: "Promotions",
      description: "Marketing emails, deals, and offers",
      query: "category:promotions",
      count: 0,
      messageIds: [],
    },
    {
      label: "Social",
      description: "Social network notifications",
      query: "category:social",
      count: 0,
      messageIds: [],
    },
    {
      label: "Updates",
      description: "Automated updates and confirmations",
      query: "category:updates older_than:30d",
      count: 0,
      messageIds: [],
    },
    {
      label: "Spam",
      description: "Messages in your spam folder",
      query: "in:spam",
      count: 0,
      messageIds: [],
    },
  ];

  await Promise.all(
    categories.map(async (cat) => {
      cat.messageIds = await getAllMessageIds(gmail, cat.query);
      cat.count = cat.messageIds.length;
    })
  );

  return categories.filter((c) => c.count > 0);
}

async function batchModifyWithRetry(
  gmail: ReturnType<typeof getGmailClient>,
  ids: string[],
  retries = 3
) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      await gmail.users.messages.batchModify({
        userId: "me",
        requestBody: {
          ids,
          addLabelIds: ["TRASH"],
        },
      });
      return;
    } catch (err: unknown) {
      const status =
        err && typeof err === "object" && "code" in err
          ? (err as { code: number }).code
          : 0;
      if (status === 429 || status >= 500) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
}

export async function deleteMessages(
  accessToken: string,
  messageIds: string[]
): Promise<{ deleted: number }> {
  const gmail = getGmailClient(accessToken);

  const batchSize = 1000;
  let deleted = 0;

  for (let i = 0; i < messageIds.length; i += batchSize) {
    const batch = messageIds.slice(i, i + batchSize);
    await batchModifyWithRetry(gmail, batch);
    deleted += batch.length;
  }

  return { deleted };
}

function parseFromHeader(from: string): { name: string; email: string } {
  const match = from.match(/^"?(.+?)"?\s*<(.+?)>$/);
  if (match) {
    return { name: match[1].trim(), email: match[2].trim() };
  }
  return { name: "", email: from.trim() };
}
