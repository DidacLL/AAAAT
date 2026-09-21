import { dialog, ipcMain, shell, type BrowserWindow } from "electron";
import { assertTrustedSender, requireWorkspaceRoot } from "./desktop-ipc-context";

import {
  applicationPacketCreateSchema,
  applicationPacketRecordSchema,
  coverLetterInputSchema,
  coverLetterRecordSchema,
  coverLetterUpdateSchema,
  cvTemplateInputSchema,
  cvTemplateRecordSchema,
  cvTemplateUpdateSchema,
  documentCollectionsSchema,
  documentDomainChannels,
  openGeneratedResultSchema,
  portableProjectExportResultSchema,
  renderedCvRecordSchema,
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
  duplicateRenderedCv,
  exportRenderedCvProject,
  listDocumentCollections,
  removeCoverLetter,
  removeCvTemplate,
  removeWorkingCv,
  renderedCvPdfPath,
  renderWorkingCv,
  saveWorkingCvAsTemplate,
  saveWorkingCvItem,
  updateCoverLetter,
  updateCvTemplate,
  updateWorkingCv,
} from "./document-domain-service";

export function registerDocumentDomainIpc(mainWindow: BrowserWindow): void {
  for (const channel of Object.values(documentDomainChannels)) ipcMain.removeHandler(channel);

  ipcMain.handle(documentDomainChannels.collections, (event) => {
    assertTrustedSender(event, mainWindow);
    return documentCollectionsSchema.parse(listDocumentCollections(requireWorkspaceRoot()));
  });
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
  ipcMain.handle(documentDomainChannels.renderCv, async (event, workingCvId: unknown) => {
    assertTrustedSender(event, mainWindow);
    return renderedCvRecordSchema.parse(
      await renderWorkingCv(requireWorkspaceRoot(), workingCvRecordSchema.shape.id.parse(workingCvId)),
    );
  });
  ipcMain.handle(documentDomainChannels.duplicateRenderedCv, (event, renderedCvId: unknown) => {
    assertTrustedSender(event, mainWindow);
    return workingCvRecordSchema.parse(
      duplicateRenderedCv(requireWorkspaceRoot(), renderedCvRecordSchema.shape.id.parse(renderedCvId)),
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
  ipcMain.handle(documentDomainChannels.packetCreate, async (event, input: unknown) => {
    assertTrustedSender(event, mainWindow);
    return applicationPacketRecordSchema.parse(
      await createApplicationPacket(requireWorkspaceRoot(), applicationPacketCreateSchema.parse(input)),
    );
  });
  ipcMain.handle(documentDomainChannels.packetOpen, async (event, packetId: unknown) => {
    assertTrustedSender(event, mainWindow);
    const pdfPath = applicationPacketPdfPath(requireWorkspaceRoot(), applicationPacketRecordSchema.shape.id.parse(packetId));
    const error = await shell.openPath(pdfPath);
    if (error) throw new Error("AAAAT could not open the retained Application packet PDF.");
    return openGeneratedResultSchema.parse({ opened: true });
  });
}
