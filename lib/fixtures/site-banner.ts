import type { SiteBannerValue } from "@/lib/validators/content-blocks"

export const siteBannerContent: SiteBannerValue = {
  enabled: false,
  title: "",
  subtext: "",
  buttonLabel: "",
  buttonHref: "",
  pinned: false,
}

export async function getSiteBannerContent(): Promise<SiteBannerValue> {
  return siteBannerContent
}
