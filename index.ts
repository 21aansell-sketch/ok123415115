/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import definePlugin from "@utils/types";

import { vencordPlugin } from "./vencord";

export default definePlugin({
    name: "SharedPluginTemplate",
    ...vencordPlugin
});
