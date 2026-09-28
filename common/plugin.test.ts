/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import assert from "node:assert/strict";
import test from "node:test";

import { buildStartMessage, DEFAULT_CONFIG } from "./plugin";

test("both adapters receive the same normalized start message", () => {
    assert.equal(buildStartMessage("Example", " ready "), "Example: ready");
    assert.equal(buildStartMessage("Example", "  "), `Example: ${DEFAULT_CONFIG.message}`);
});
