import { app, dialog, ipcMain, nativeImage, shell, type BrowserWindow } from "electron";
import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import { assertTrustedSender, requireWorkspaceRoot } from "./desktop-ipc-context";

import {
  applicationDocumentExternalAccessSchema,
  applicationDocumentExternalAccessUpdateSchema,
  applicationPacketCreateSchema,
  applicationPacketRecordSchema,
  availableBlueprintsSchema,
  coverLetterInputSchema,
  coverLetterRecordSchema,
  coverLetterUpdateSchema,
  cvTemplateInputSchema,
  cvTemplateRecordSchema,
  cvTemplateUpdateSchema,
  cvDocumentImageSchema,
  cvImagePreviewSchema,
  documentCollectionsSchema,
  documentDomainChannels,
  openGeneratedResultSchema,
  portableProjectExportResultSchema,
  renderedCoverLetterRecordSchema,
  renderedCvRecordSchema,
  renderCvRequestSchema,
  renderLetterRequestSchema,
  workingCvCreateSchema,
  workingCvRecordSchema,
  workingCvSaveItemSchema,
  workingCvSaveTemplateSchema,
  workingCvUpdateSchema,
} from "../shared/document-domain-contracts";
import {
  applicationPacketPdfPath,
  createApplicationPacket,
  createCoverLetter,
  createCvTemplate,
  createWorkingCv,
  prepareWorkingCv,
  prepareCoverLetter,
  prepareRenderedCvCopy,
  exportApplicationPacketProject,
  exportRenderedCoverLetterProject,
  exportRenderedCvProject,
  listDocumentCollections,
  removeCoverLetter,
  removeCvTemplate,
  removeWorkingCv,
  renderedCoverLetterPdfPath,
  renderedCvPdfPath,
  renderCoverLetter,
  renderWorkingCv,
  saveWorkingCvAsTemplate,
  saveWorkingCvItem,
  updateCoverLetter,
  updateCvTemplate,
  updateWorkingCv,
} from "./document-domain-service";
import {
  getApplicationDocumentExternalAccess,
  updateApplicationDocumentExternalAccess,
} from "./application-document-external-access-service";
import { listAvailableBlueprints, resolveBlueprintSource } from "./document-blueprints";
import { cvImageDimensions, maximumCvImageBytes, previewCvImage, storeCvImage } from "./document-image-service";

export function registerDocumentDomainIpc(mainWindow: BrowserWindow): void {
  for (const channel of Object.values(documentDomainChannels)) ipcMain.removeHandler(channel);

  ipcMain.handle(documentDomainChannels.collections, (event) => {
    assertTrustedSender(event, mainWindow);
    return documentCollectionsSchema.parse(listDocumentCollections(requireWorkspaceRoot()));
  });
  ipcMain.handle(documentDomainChannels.blueprints, (event) => {
    assertTrustedSender(event, mainWindow);
    return availableBlueprintsSchema.parse(listAvailableBlueprints(app.getPath("userData")));
  });
  ipcMain.handle(documentDomainChannels.chooseCvImage, async (event) => {
    assertTrustedSender(event, mainWindow);
    const rootPath = requireWorkspaceRoot();
    const selected = await dialog.showOpenDialog(mainWindow, {
      title: "Choose a CV photo or banner",
      properties: ["openFile"],
      filters: [{ name: "PNG or JPEG image", extensions: ["png", "jpg", "jpeg"] }],
    });
    if (selected.canceled || !selected.filePaths[0]) return null;
    if (requireWorkspaceRoot() !== rootPath) throw new Error("The workspace changed. Choose the image again.");
    const file = selected.filePaths[0];
    const size = statSync(file).size;
    if (size === 0 || size > maximumCvImageBytes) throw new Error("Choose a non-empty PNG or JPEG image smaller than 20 MB.");
    const bytes = readFileSync(file);
    const dimensions = cvImageDimensions(bytes);
    const decoded = nativeImage.createFromBuffer(bytes);
    if (decoded.isEmpty()) throw new Error("This image could not be opened. Choose another PNG or JPEG.");
    const actual = decoded.getSize();
    const sameDimensions = actual.width === dimensions.width && actual.height === dimensions.height;
    const rotatedDimensions = actual.width === dimensions.height && actual.height === dimensions.width;
    if (!sameDimensions && !rotatedDimensions) throw new Error("The image dimensions could not be verified.");
    return storeCvImage(rootPath, decoded.toPNG(), path.basename(file), actual.width / actual.height > 1.5 ? "banner" : "photo");
  });
  ipcMain.handle(documentDomainChannels.cvImagePreview, (event, assetId: unknown) => {
    assertTrustedSender(event, mainWindow);
    return cvImagePreviewSchema.parse(previewCvImage(requireWorkspaceRoot(), cvDocumentImageSchema.shape.assetId.parse(assetId)));
  });
  ipcMain.handle(
    documentDomainChannels.externalApplicationAccessCurrent,
    (event, candidatureId: unknown) => {
      assertTrustedSender(event, mainWindow);
      const id = applicationDocumentExternalAccessSchema.shape.candidatureId.parse(candidatureId);
      return applicationDocumentExternalAccessSchema.parse(
        getApplicationDocumentExternalAccess(requireWorkspaceRoot(), id),
      );
    },
  );
  ipcMain.handle(
    documentDomainChannels.externalApplicationAccessUpdate,
    (event, input: unknown) => {
      assertTrustedSender(event, mainWindow);
      return applicationDocumentExternalAccessSchema.parse(
        updateApplicationDocumentExternalAccess(
          requireWorkspaceRoot(),
          applicationDocumentExternalAccessUpdateSchema.parse(input),
        ),
      );
    },
  );
  ipcMain.handle(documentDomainChannels.templateCreate, (event, input: unknown) => {
    assertTrustedSender(event, mainWindow);
    return documentCollectionsSchema.parse(createCvTemplate(requireWorkspaceRoot(), cvTemplateInputSchema.parse(input)));
  });
  ipcMain.handle(documentDomainChannels.templateUpdate, (event, input: unknown) => {
    assertTrustedSender(event, mainWindow);
    return documentCollectionsSchema.parse(updateCvTemplate(requireWorkspaceRoot(), cvTemplateUpdateSchema.parse(input)));
  });
  ipcMain.handle(documentDomainChannels.templateRemove, (event, templateId: unknown) => {
    assertTrustedSender(event, mainWindow);
    return documentCollectionsSchema.parse(removeCvTemplate(requireWorkspaceRoot(), cvTemplateRecordSchema.shape.id.parse(templateId)));
  });
  ipcMain.handle(documentDomainChannels.workingCreate, (event, input: unknown) => {
    assertTrustedSender(event, mainWindow);
    return workingCvRecordSchema.parse(createWorkingCv(requireWorkspaceRoot(), workingCvCreateSchema.parse(input)));
  });
  ipcMain.handle(documentDomainChannels.workingPrepare, (event, input: unknown) => {
    assertTrustedSender(event, mainWindow);
    return workingCvRecordSchema.parse(prepareWorkingCv(requireWorkspaceRoot(), workingCvCreateSchema.parse(input)));
  });
  ipcMain.handle(documentDomainChannels.letterPrepare, (event, input: unknown) => {
    assertTrustedSender(event, mainWindow);
    return coverLetterRecordSchema.parse(prepareCoverLetter(requireWorkspaceRoot(), coverLetterInputSchema.parse(input)));
  });
  ipcMain.handle(documentDomainChannels.workingUpdate, (event, input: unknown) => {
    assertTrustedSender(event, mainWindow);
    return workingCvRecordSchema.parse(updateWorkingCv(requireWorkspaceRoot(), workingCvUpdateSchema.parse(input)));
  });
  ipcMain.handle(documentDomainChannels.workingRemove, (event, workingCvId: unknown) => {
    assertTrustedSender(event, mainWindow);
    return documentCollectionsSchema.parse(removeWorkingCv(requireWorkspaceRoot(), workingCvRecordSchema.shape.id.parse(workingCvId)));
  });
  ipcMain.handle(documentDomainChannels.workingSaveItem, (event, input: unknown) => {
    assertTrustedSender(event, mainWindow);
    return workingCvRecordSchema.parse(saveWorkingCvItem(requireWorkspaceRoot(), workingCvSaveItemSchema.parse(input)));
  });
  ipcMain.handle(documentDomainChannels.workingSaveTemplate, (event, input: unknown) => {
    assertTrustedSender(event, mainWindow);
    return cvTemplateRecordSchema.parse(saveWorkingCvAsTemplate(requireWorkspaceRoot(), workingCvSaveTemplateSchema.parse(input)));
  });
  ipcMain.handle(documentDomainChannels.renderCv, async (event, input: unknown) => {
    assertTrustedSender(event, mainWindow);
    const request = renderCvRequestSchema.parse(input);
    const blueprintSource = resolveBlueprintSource(app.getPath("userData"), request.blueprintId);
    return renderedCvRecordSchema.parse(
      await renderWorkingCv(requireWorkspaceRoot(), request.cvId, blueprintSource),
    );
  });
  ipcMain.handle(documentDomainChannels.prepareRenderedCvCopy, (event, renderedCvId: unknown) => {
    assertTrustedSender(event, mainWindow);
    return workingCvRecordSchema.parse(
      prepareRenderedCvCopy(requireWorkspaceRoot(), renderedCvRecordSchema.shape.id.parse(renderedCvId)),
    );
  });
  ipcMain.handle(documentDomainChannels.openRenderedCv, async (event, renderedCvId: unknown) => {
    assertTrustedSender(event, mainWindow);
    const pdfPath = renderedCvPdfPath(requireWorkspaceRoot(), renderedCvRecordSchema.shape.id.parse(renderedCvId));
    const error = await shell.openPath(pdfPath);
    if (error) throw new Error("AAAAT could not open the retained Rendered CV PDF.");
    return openGeneratedResultSchema.parse({ opened: true });
  });
  ipcMain.handle(documentDomainChannels.exportRenderedCv, async (event, renderedCvId: unknown) => {
    assertTrustedSender(event, mainWindow);
    const id = renderedCvRecordSchema.shape.id.parse(renderedCvId);
    const selected = await dialog.showOpenDialog(mainWindow, {
      title: "Export portable CV project",
      properties: ["openDirectory", "createDirectory"],
    });
    if (selected.canceled || selected.filePaths.length === 0) return null;
    return portableProjectExportResultSchema.parse({
      exportedPath: exportRenderedCvProject(requireWorkspaceRoot(), id, selected.filePaths[0] ?? ""),
    });
  });
  ipcMain.handle(documentDomainChannels.letterCreate, (event, input: unknown) => {
    assertTrustedSender(event, mainWindow);
    return coverLetterRecordSchema.parse(createCoverLetter(requireWorkspaceRoot(), coverLetterInputSchema.parse(input)));
  });
  ipcMain.handle(documentDomainChannels.letterUpdate, (event, input: unknown) => {
    assertTrustedSender(event, mainWindow);
    return coverLetterRecordSchema.parse(updateCoverLetter(requireWorkspaceRoot(), coverLetterUpdateSchema.parse(input)));
  });
  ipcMain.handle(documentDomainChannels.letterRemove, (event, letterId: unknown) => {
    assertTrustedSender(event, mainWindow);
    return documentCollectionsSchema.parse(removeCoverLetter(requireWorkspaceRoot(), coverLetterRecordSchema.shape.id.parse(letterId)));
  });
  ipcMain.handle(documentDomainChannels.renderLetter, async (event, input: unknown) => {
    assertTrustedSender(event, mainWindow);
    const request = renderLetterRequestSchema.parse(input);
    return renderedCoverLetterRecordSchema.parse(
      await renderCoverLetter(requireWorkspaceRoot(), request.letterId),
    );
  });
  ipcMain.handle(documentDomainChannels.openRenderedLetter, async (event, renderedLetterId: unknown) => {
    assertTrustedSender(event, mainWindow);
    const pdfPath = renderedCoverLetterPdfPath(
      requireWorkspaceRoot(),
      renderedCoverLetterRecordSchema.shape.id.parse(renderedLetterId),
    );
    const error = await shell.openPath(pdfPath);
    if (error) throw new Error("AAAAT could not open the retained cover-letter PDF.");
    return openGeneratedResultSchema.parse({ opened: true });
  });
  ipcMain.handle(documentDomainChannels.exportRenderedLetter, async (event, renderedLetterId: unknown) => {
    assertTrustedSender(event, mainWindow);
    const id = renderedCoverLetterRecordSchema.shape.id.parse(renderedLetterId);
    const selected = await dialog.showOpenDialog(mainWindow, {
      title: "Export portable cover-letter source project",
      properties: ["openDirectory", "createDirectory"],
    });
    if (selected.canceled || selected.filePaths.length === 0) return null;
    return portableProjectExportResultSchema.parse({
      exportedPath: exportRenderedCoverLetterProject(
        requireWorkspaceRoot(),
        id,
        selected.filePaths[0] ?? "",
      ),
    });
  });
  ipcMain.handle(documentDomainChannels.packetCreate, async (event, input: unknown) => {
    assertTrustedSender(event, mainWindow);
    const request = applicationPacketCreateSchema.parse(input);
    const blueprintSource = resolveBlueprintSource(app.getPath("userData"), request.blueprintId);
    return applicationPacketRecordSchema.parse(
      await createApplicationPacket(requireWorkspaceRoot(), request, blueprintSource),
    );
  });
  ipcMain.handle(documentDomainChannels.packetOpen, async (event, packetId: unknown) => {
    assertTrustedSender(event, mainWindow);
    const pdfPath = applicationPacketPdfPath(requireWorkspaceRoot(), applicationPacketRecordSchema.shape.id.parse(packetId));
    const error = await shell.openPath(pdfPath);
    if (error) throw new Error("AAAAT could not open the retained Application packet PDF.");
    return openGeneratedResultSchema.parse({ opened: true });
  });
  ipcMain.handle(documentDomainChannels.packetExport, async (event, packetId: unknown) => {
    assertTrustedSender(event, mainWindow);
    const id = applicationPacketRecordSchema.shape.id.parse(packetId);
    const selected = await dialog.showOpenDialog(mainWindow, {
      title: "Export portable application-packet source project",
      properties: ["openDirectory", "createDirectory"],
    });
    if (selected.canceled || selected.filePaths.length === 0) return null;
    return portableProjectExportResultSchema.parse({
      exportedPath: exportApplicationPacketProject(
        requireWorkspaceRoot(),
        id,
        selected.filePaths[0] ?? "",
      ),
    });
  });
}
