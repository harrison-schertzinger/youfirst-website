import { permanentRedirect } from "next/navigation";

/**
 * /admin/rosters was the real Command Center while /admin was a thin landing
 * page. As of 2026-08-25 that is inverted: the roster IS /admin. This route
 * stays only so existing links, bookmarks, and anything already sent to a
 * coach keep working. 308, so clients stop asking.
 */
export default function RostersRedirect() {
  permanentRedirect("/admin");
}
