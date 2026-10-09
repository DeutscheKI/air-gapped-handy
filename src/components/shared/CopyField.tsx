import React from "react";
import { useTranslation } from "react-i18next";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";

interface CopyFieldProps {
  /** Optional caption above the value. */
  label?: string;
  /** The text shown in full and copied on click: a URL, a path, a command. */
  value: string;
}

/**
 * A read-only value with a copy button. Used wherever upstream had a link or
 * a download: this fork shows the address instead of opening it.
 */
const CopyField: React.FC<CopyFieldProps> = ({ label, value }) => {
  const { t } = useTranslation();
  const { copied, copy } = useCopyToClipboard();

  return (
    <div className="space-y-1">
      {label !== undefined && (
        <p className="text-xs font-medium text-text/60">{label}</p>
      )}
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0 px-2 py-2 bg-mid-gray/10 border border-mid-gray/80 rounded-lg text-xs font-mono break-all select-text cursor-text">
          {value}
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => void copy(value)}
          className="flex items-center gap-1.5 px-3 py-2 shrink-0"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
          <span>{copied ? t("common.copied") : t("common.copy")}</span>
        </Button>
      </div>
    </div>
  );
};

export default CopyField;
