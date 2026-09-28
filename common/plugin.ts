/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface LocalMessageEdit {
    content: string;
    original?: string;
}

export interface SharedPluginConfig {
    edits: Record<string, LocalMessageEdit>;
}

export const DEFAULT_CONFIG: SharedPluginConfig = {
    edits: {}
};
