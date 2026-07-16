# AAAAT release installers

AAAAT ships native installers built from one application definition. Users do
not install Python, run commands, choose a package manager, or receive the
repository tree.

The release workflow builds the native form on its own operating system:

- Windows: MSI installer.
- macOS: DMG installer.
- Linux: AppImage.

The installer opens AAAAT after installation. First launch asks once for the
private workspace folder; it never uses the installation folder, a repository,
or an AI host's working directory.

This build workflow is release engineering material, not user setup guidance.
