import User from "../models/User.js";
import OrgMembership from "../models/OrgMembership.js";

/** Resolve @Name tokens in text to user IDs within an org */
export async function resolveMentions(
  content: string,
  orgId: string,
): Promise<string[]> {
  const names = [...content.matchAll(/@([\w.\-]+)/g)].map((m) => m[1]);
  if (names.length === 0) return [];

  const memberships = await OrgMembership.find({
    orgId,
    status: "Active",
  }).select("userId");
  const userIds = memberships.map((m) => m.userId);
  const users = await User.find({
    _id: { $in: userIds },
    $or: names.map((n) => ({
      name: new RegExp(`^${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i"),
    })),
  }).select("_id name");

  return users.map((u) => String(u._id));
}

/** Highlight @mentions in HTML-safe plain text (returns segments for UI) */
export function parseMentionSegments(
  text: string,
): Array<{ type: "text" | "mention"; value: string }> {
  const parts: Array<{ type: "text" | "mention"; value: string }> = [];
  const re = /@([\w.\-]+)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      parts.push({ type: "text", value: text.slice(last, m.index) });
    }
    parts.push({ type: "mention", value: m[0] });
    last = m.index + m[0].length;
  }
  if (last < text.length) {
    parts.push({ type: "text", value: text.slice(last) });
  }
  return parts;
}
