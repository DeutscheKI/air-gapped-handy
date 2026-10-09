import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  commands,
  type ModelFileVerification,
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

const formatBytes = (bytes: number): string => `${bytes.toLocaleString()} B`;

/**
 * Replaces the download button: this fork never touches the network, so the
 * user fetches the file elsewhere and drops it where Handy looks for it.
 * For a model already on disk it shows the file Handy found, flags a size
 * that differs from the catalog, and can hash the file against the catalog.
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
  const [verifying, setVerifying] = useState(false);
  const [verification, setVerification] =
    useState<ModelFileVerification | null>(null);

  const modelId = model?.id ?? null;

  useEffect(() => {
    setInstructions(null);
    setError(null);
    setStillMissing(false);
    setVerification(null);
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

  const handleVerify = async () => {
    if (!modelId) return;
    setVerifying(true);
    setVerification(null);
    try {
      const result = await commands.verifyModelFile(modelId);
      if (result.status === "ok") {
        setVerification(result.data);
      } else {
        setError(result.error);
      }
    } finally {
      setVerifying(false);
    }
  };

  const onDisk = instructions?.on_disk ?? null;
  const expectedSize = instructions?.expected_size_bytes ?? null;
  const sizeMismatch =
    onDisk !== null &&
    expectedSize !== null &&
    onDisk.size_bytes !== expectedSize;
  const modelName = model ? getTranslatedModelName(model, t) : "";

  return (
    <Dialog
      open={model !== null}
      title={
        onDisk
          ? t("modelInstall.detailsTitle", { modelName })
          : t("modelInstall.title", { modelName })
      }
      description={onDisk ? undefined : t("modelInstall.intro")}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      closeLabel={t("common.close")}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>
            {t("common.close")}
          </Button>
          {onDisk ? (
            <Button
              variant="primary-soft"
              size="sm"
              onClick={handleVerify}
              disabled={verifying}
            >
              {verifying
                ? t("modelInstall.verifying")
                : t("modelInstall.verify")}
            </Button>
          ) : (
            <Button
              variant="primary-soft"
              size="sm"
              onClick={handleCheckAgain}
              disabled={checking || instructions === null}
            >
              {t("modelInstall.checkAgain")}
            </Button>
          )}
        </>
      }
    >
      {error && (
        <p className="text-sm text-red-400">
          {t("modelInstall.loadError", { error })}
        </p>
      )}
      {instructions && onDisk && (
        <div className="space-y-4">
          <CopyField
            label={t("modelInstall.onDiskLabel")}
            value={onDisk.path}
          />
          {sizeMismatch ? (
            <p className="text-sm text-red-400">
              {t("modelInstall.sizeMismatch", {
                actual: formatBytes(onDisk.size_bytes),
                expected: formatBytes(expectedSize ?? 0),
              })}
            </p>
          ) : (
            <p className="text-sm text-text/60">
              {t("modelInstall.sizeOk", {
                size: formatBytes(onDisk.size_bytes),
              })}
            </p>
          )}
          {instructions.sha256 && (
            <CopyField
              label={t("modelInstall.sha256Label")}
              value={instructions.sha256}
            />
          )}
          {verification && (
            <CopyField
              label={t("modelInstall.actualSha256Label")}
              value={verification.sha256}
            />
          )}
          {verification?.matches === true && (
            <p className="text-sm text-green-500">
              {t("modelInstall.checksumOk")}
            </p>
          )}
          {verification?.matches === false && (
            <p className="text-sm text-red-400">
              {t("modelInstall.checksumMismatch")}
            </p>
          )}
          <CopyField
            label={t("modelInstall.linkLabel")}
            value={instructions.url}
          />
        </div>
      )}
      {instructions && !onDisk && (
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
