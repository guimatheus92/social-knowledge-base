"use client";

import { useState } from "react";
import { Link2 } from "lucide-react";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MediaTypeToggle } from "@/components/controls/MediaTypeToggle";
import { useT } from "@/i18n/I18nProvider";
import type { MediaType } from "@/lib/types";

const DEFAULT_MEDIA: MediaType[] = ["video"];

function isSupportedUrl(value: string) {
  const v = value.trim();
  return (
    /instagram\.com\/(reel|reels|p|tv|stories)\//i.test(v) ||
    /tiktok\.com\/.+\/video\/\d+/i.test(v) ||
    /tiktok\.com\/t\//i.test(v)
  );
}

/**
 * Downloads a SINGLE video from a link. The owner is resolved from the URL and
 * the account is created/updated automatically — the rest follows the normal
 * download pattern.
 */
export function DownloadByLinkDialog({
  onDownload,
  disabled,
}: {
  onDownload: (data: { url: string; media: MediaType[] }) => void;
  disabled?: boolean;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [media, setMedia] = useState<MediaType[]>(DEFAULT_MEDIA);

  const canDownload = isSupportedUrl(url);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setUrl("");
      setMedia(DEFAULT_MEDIA);
    }
  }

  function submit() {
    if (!canDownload) return;
    onDownload({ url: url.trim(), media });
    handleOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Tooltip>
        <TooltipTrigger
          render={
            <DialogTrigger
              render={
                <Button variant="outline" disabled={disabled}>
                  <Link2 />
                  {t("byLink.trigger")}
                </Button>
              }
            />
          }
        />
        <TooltipContent>
          {disabled ? t("byLink.triggerTipDisabled") : t("byLink.triggerTip")}
        </TooltipContent>
      </Tooltip>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("byLink.title")}</DialogTitle>
          <DialogDescription>{t("byLink.description")}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dl-link-url" className="text-xs text-muted-foreground">
              {t("byLink.urlLabel")}
            </Label>
            <Input
              id="dl-link-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.instagram.com/reel/…  ou  tiktok.com/@user/video/…"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              required
            />
          </div>

          <MediaTypeToggle value={media} onChange={setMedia} />
        </div>

        <DialogFooter>
          <Tooltip>
            <TooltipTrigger
              render={<DialogClose render={<Button variant="outline">{t("common.cancel")}</Button>} />}
            />
            <TooltipContent>{t("common.dismiss")}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger
              render={
                <Button onClick={submit} disabled={!canDownload}>
                  <Link2 />
                  {t("byLink.submit")}
                </Button>
              }
            />
            <TooltipContent>
              {canDownload ? t("byLink.submitTipOk") : t("byLink.submitTipNeed")}
            </TooltipContent>
          </Tooltip>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
