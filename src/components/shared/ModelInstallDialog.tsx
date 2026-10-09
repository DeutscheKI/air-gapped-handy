import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  commands,
  type ModelInfo,
  type ModelInstallInstructions,
} from "@/bindings";
import { Dialog } from "@/components/ui";
import { Button } from "@/components/ui/Button";
import CopyField from "./CopyField";
import { useModelStore } from "@/stores/modelStore";
import { getTranslatedModelName } from "@/lib/utils/modelTranslation";

interface ModelInstallDialogProps {
  /** The model to show instructions for; `null` keeps the dialog closed. */
  model: ModelInfo | null;
  onClose: () => void;
  /** Called once "Check again" finds the file on disk. */
  onInstalled: (modelId: string) => void;
}

/**
 * Replaces the download button: this fork never touches the network, so the
 * user fetches the file elsewhere and drops it where Handy looks for it.
 */
const ModelInstallDialog: React.FC<ModelInstallDialogProps> = ({
  model,
  onClose,
  onInstalled,
}) => {
  const { t } = useTranslation();
  const { rescanLocalModels, loadModels } = useModelStore();
  const [instructions, setInstructions] =
    useState<ModelInstallInstructions | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [stillMissing, setStillMissing] = useState(false);

  const modelId = model?.id ?? null;

  useEffect(() => {
    setInstructions(null);
    setError(null);
    setStillMissing(false);
    if (!modelId) return;

    let cancelled = false;
    commands.getModelInstallInstructions(modelId).then((result) => {
      if (cancelled) return;
      if (result.status === "ok") {
        setInstructions(result.data);
      } else {
        setError(result.error);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [modelId]);

  const handleCheckAgain = async () => {
    if (!modelId) return;
    setChecking(true);
    setStillMissing(false);
    try {
      await rescanLocalModels();
      await loadModels();
      const found = useModelStore
        .getState()
        .models.find((m) => m.id === modelId);
      if (found?.is_downloaded) {
        onInstalled(modelId);
      } else {
        setStillMissing(true);
      }
    } finally {
      setChecking(false);
    }
  };

  return (
    <Dialog
      open={model !== null}
      title={t("modelInstall.title", {
        modelName: model ? getTranslatedModelName(model, t) : "",
      })}
      description={t("modelInstall.intro")}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      closeLabel={t("common.close")}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>
            {t("common.close")}
          </Button>
          <Button
            variant="primary-soft"
            size="sm"
            onClick={handleCheckAgain}
            disabled={checking || instructions === null}
          >
            {t("modelInstall.checkAgain")}
          </Button>
        </>
      }
    >
      {error && (
        <p className="text-sm text-red-400">
          {t("modelInstall.loadError", { error })}
        </p>
      )}
      {instructions && (
        <div className="space-y-4">
          <CopyField
            label={t("modelInstall.linkLabel")}
            value={instructions.url}
          />
          <CopyField
            label={t("modelInstall.pathLabel")}
            value={instructions.target_path}
          />
          <CopyField
            label={t("modelInstall.cliLabel")}
            value={instructions.hf_cli_command}
          />
          {instructions.sha256 && (
            <CopyField
              label={t("modelInstall.sha256Label")}
              value={instructions.sha256}
            />
          )}
          {stillMissing && (
            <p className="text-sm text-text/60">
              {t("modelInstall.stillMissing")}
            </p>
          )}
        </div>
      )}
    </Dialog>
  );
};

export default ModelInstallDialog;
