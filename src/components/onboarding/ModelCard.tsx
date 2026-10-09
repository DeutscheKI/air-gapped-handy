import React from "react";
import { useTranslation } from "react-i18next";
import {
  AudioLines,
  Check,
  Download,
  Globe,
  HardDrive,
  Info,
  Languages,
  Loader2,
  Trash2,
} from "lucide-react";
import type { ModelInfo } from "@/bindings";
import { formatModelSize } from "../../lib/utils/format";
import {
  getTranslatedModelDescription,
  getTranslatedModelName,
} from "../../lib/utils/modelTranslation";
import {
  getLanguageLabel,
  getUniqueCapabilityLanguages,
} from "../../lib/constants/languages";
import Badge from "../ui/Badge";
import { Button } from "../ui/Button";
import { useSettingsStore } from "@/stores/settingsStore";

// Get display text for model's language support
const getLanguageDisplayText = (
  supportedLanguages: string[],
  t: (key: string, options?: Record<string, unknown>) => string,
): string => {
  const capabilityLanguages = getUniqueCapabilityLanguages(supportedLanguages);
  if (capabilityLanguages.length === 1) {
    const langCode = capabilityLanguages[0];
    const langName = getLanguageLabel(langCode) || langCode;
    return t("modelSelector.capabilities.languageOnly", { language: langName });
  }
  return t("modelSelector.capabilities.languageCount", {
    total: capabilityLanguages.length,
  });
};

// Legacy = a pre-catalog .bin/ONNX model with no source to install from; it is
// kept runnable when its file is already on disk (catalog GGUFs supersede it).
export const isLegacySource = (model: ModelInfo): boolean =>
  model.source === "Legacy";

// Catalog models have a pinned upstream file, so their install details (link,
// expected size and SHA-256) stay useful after the file is on disk.
const hasInstallSource = (model: ModelInfo): boolean =>
  typeof model.source === "object" && "HuggingFace" in model.source;

// Extract a GGUF quantization label from a filename, if present (e.g. "Q8_0").
const getQuantLabel = (filename: string): string | null => {
  const match = filename.match(
    /[._-](IQ\d+_\w+|Q\d+(?:_\w+)?|F16|BF16|F32)\.gguf$/i,
  );
  return match ? match[1].toUpperCase() : null;
};

export type ModelCardStatus =
  /** Not on disk: clicking opens the manual install instructions. */
  "installable" | "switching" | "active" | "available";

interface ModelCardProps {
  model: ModelInfo;
  variant?: "default" | "featured";
  status?: ModelCardStatus;
  disabled?: boolean;
  className?: string;
  onSelect: (modelId: string) => void;
  /**
   * Opens the manual install instructions; this fork never downloads. For an
   * installed catalog model the same dialog shows the file and verifies it.
   */
  onInstall?: (modelId: string) => void;
  onDelete?: (modelId: string) => void;
  showRecommended?: boolean;
}

const ModelCard: React.FC<ModelCardProps> = ({
  model,
  variant = "default",
  status = "installable",
  disabled = false,
  className = "",
  onSelect,
  onInstall,
  onDelete,
  showRecommended = true,
}) => {
  const { t } = useTranslation();
  const debugMode = useSettingsStore(
    (state) => state.settings?.debug_mode ?? false,
  );
  const isFeatured = variant === "featured";
  // The active model is already loaded — re-selecting it just reloads it for no
  // gain, so it is deliberately not clickable.
  const isClickable = status === "available" || status === "installable";

  // Get translated model name and description
  const displayName = getTranslatedModelName(model, t);
  const displayDescription = getTranslatedModelDescription(model, t);
  const showModelSize =
    status === "installable" || status === "available" || status === "active";
  const formattedModelSize = formatModelSize(Number(model.size_mb));
  const quantLabel = getQuantLabel(model.filename);
  const capabilityLanguages = getUniqueCapabilityLanguages(
    model.supported_languages,
  );

  const baseClasses =
    "flex flex-col rounded-xl px-4 py-3 gap-2 text-left transition-all duration-200";

  const getVariantClasses = () => {
    if (status === "active") {
      return "border-2 border-logo-primary/50 bg-logo-primary/10";
    }
    if (isFeatured) {
      return "border-2 border-logo-primary/25 bg-logo-primary/5";
    }
    return "border-2 border-mid-gray/20";
  };

  const getInteractiveClasses = () => {
    if (!isClickable) return "";
    if (disabled) return "opacity-50 cursor-not-allowed";
    return "cursor-pointer hover:border-logo-primary/50 hover:bg-logo-primary/5 hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] group";
  };

  const handleClick = () => {
    if (!isClickable || disabled) return;
    if (status === "installable" && onInstall) {
      onInstall(model.id);
    } else {
      onSelect(model.id);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(model.id);
  };

  const handleDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    onInstall?.(model.id);
  };
  const showDetails =
    onInstall !== undefined &&
    (status === "available" || status === "active") &&
    hasInstallSource(model);

  return (
    <div
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" && isClickable) handleClick();
      }}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      className={[
        baseClasses,
        getVariantClasses(),
        getInteractiveClasses(),
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Top section: name/description + score bars */}
      <div className="flex justify-between items-center w-full">
        <div className="flex flex-col items-start flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h3
              className={`text-base font-semibold text-text ${isClickable ? "group-hover:text-logo-primary" : ""} transition-colors`}
            >
              {displayName}
            </h3>
            {showRecommended && model.is_recommended && (
              <Badge variant="primary">{t("onboarding.recommended")}</Badge>
            )}
            {status === "active" && (
              <Badge variant="primary">
                <Check className="w-3 h-3 mr-1" />
                {t("modelSelector.active")}
              </Badge>
            )}
            {model.is_custom && (
              <Badge variant="secondary">{t("modelSelector.custom")}</Badge>
            )}
            {isLegacySource(model) && (
              <Badge variant="secondary">{t("modelSelector.legacy")}</Badge>
            )}
            {status === "switching" && (
              <Badge variant="secondary">
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                {t("modelSelector.switching")}
              </Badge>
            )}
          </div>
          <p className="text-text/60 text-sm leading-relaxed">
            {displayDescription}
          </p>
        </div>
        {(model.accuracy_score > 0 || model.speed_score > 0) && (
          <div className="hidden sm:flex items-center ms-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <p className="text-xs text-text/60 w-24 text-end">
                  {t("onboarding.modelCard.accuracy")}
                </p>
                <div className="w-16 h-1.5 bg-mid-gray/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-logo-primary rounded-full"
                    style={{ width: `${model.accuracy_score * 100}%` }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-xs text-text/60 w-24 text-end">
                  {t("onboarding.modelCard.speed")}
                </p>
                <div className="w-16 h-1.5 bg-mid-gray/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-logo-primary rounded-full"
                    style={{ width: `${model.speed_score * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <hr className="w-full border-mid-gray/20" />

      {/* Bottom row: tags + action buttons (full width) */}
      <div className="flex items-center gap-3 w-full -mb-0.5 mt-0.5 h-5">
        {capabilityLanguages.length > 0 && (
          <div
            className="flex items-center gap-1 text-xs text-text/50"
            title={
              capabilityLanguages.length === 1
                ? t("modelSelector.capabilities.singleLanguage")
                : t("modelSelector.capabilities.languageSelection")
            }
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{getLanguageDisplayText(model.supported_languages, t)}</span>
          </div>
        )}
        {model.supports_translation && (
          <div
            className="flex items-center gap-1 text-xs text-text/50"
            title={t("modelSelector.capabilities.translation")}
          >
            <Languages className="w-3.5 h-3.5" />
            <span>{t("modelSelector.capabilities.translate")}</span>
          </div>
        )}
        {model.supports_streaming && (
          <div
            className="flex items-center gap-1 text-xs text-text/50"
            title={t("modelSelector.capabilities.streaming")}
          >
            <AudioLines className="w-3.5 h-3.5" />
            <span>{t("modelSelector.streaming")}</span>
          </div>
        )}
        {showModelSize && (
          <span className="flex items-center gap-1.5 ms-auto text-xs text-text/50">
            {status === "installable" ? (
              <Download className="w-3.5 h-3.5" />
            ) : (
              <HardDrive className="w-3.5 h-3.5" />
            )}
            <span>{formattedModelSize}</span>
            {debugMode && quantLabel && (
              <span className="text-text/40">{quantLabel}</span>
            )}
          </span>
        )}
        {showDetails && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDetails}
            title={t("modelInstall.details")}
            className="flex items-center gap-1.5 text-text/60 hover:text-text hover:bg-mid-gray/10"
          >
            <Info className="w-3.5 h-3.5" />
            <span>{t("modelInstall.details")}</span>
          </Button>
        )}
        {onDelete && (status === "available" || status === "active") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            title={t("modelSelector.deleteModel", { modelName: displayName })}
            className="flex items-center gap-1.5 text-logo-primary/85 hover:text-logo-primary hover:bg-logo-primary/10"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{t("common.delete")}</span>
          </Button>
        )}
      </div>
    </div>
  );
};

export default ModelCard;
