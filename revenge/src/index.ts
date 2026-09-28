import { findByProps, findByStoreName } from "@vendetta/metro";
import { after, instead } from "@vendetta/patcher";
import { ReactNative as RN } from "@vendetta/metro/common";
import { registerCommand } from "@vendetta/commands";
import { showToast } from "@vendetta/ui/toasts";

import { pluginStorage, initializeStorage } from "./state";

const BUILD = 345009;
const patches: Array<() => void> = [];
const commands: Array<() => void> = [];

function getKey(messageId: string) {
    return messageId;
}

function getMessageStore(): any | null {
    return (
        findByStoreName?.("MessageStore") ??
        findByProps?.("getMessage", "getMessages") ??
        findByProps?.("getMessage")
    );
}

function cloneWithLocalContent(message: any) {
    if (!message?.id) return message;

    const edit = pluginStorage.edits?.[getKey(String(message.id))];
    if (!edit) return message;

    return {
        ...message,
        content: edit.content,
        edited: true,
        __localMessageEdit: true,
        // Keep the server's original edit metadata intact where possible.
        edited_timestamp: message.edited_timestamp
    };
}

function refreshMessage(channelId: string, messageId: string) {
    const dispatcher = findByProps?.("_currentDispatchActionType", "dispatch");
    if (!dispatcher?.dispatch) return;

    // This is a local Flux event. It does not call Discord's REST message-edit
    // endpoint. Supplying the current server-side message causes subscribers
    // to re-render while getMessage() below supplies the local content.
    const store = getMessageStore();
    const rawGetMessage = store?.getMessage;
    const displayed = typeof rawGetMessage === "function"
        ? rawGetMessage.call(store, channelId, messageId)
        : undefined;

    if (displayed) {
        const local = pluginStorage.edits?.[getKey(messageId)];
        const original = local?.original;

        dispatcher.dispatch({
            type: "MESSAGE_UPDATE",
            message: original !== undefined
                ? { ...displayed, content: original, __localMessageEdit: undefined }
                : displayed
        });
    }
}

function setLocalEdit(messageId: string, content: string, channelId?: string) {
    const id = String(messageId).trim();
    if (!id) throw new Error("Message ID is required.");

    const store = getMessageStore();
    const raw = store?.getMessage;
    const existing = pluginStorage.edits[id];

    let original = existing?.original;
    if (original === undefined && typeof raw === "function" && channelId) {
        const message = raw.call(store, channelId, id);
        if (message?.id === id)
            original = String(message.content ?? "");
    }

    if (original === undefined)
        original = "";

    pluginStorage.edits[id] = {
        content,
        original
    };

    if (channelId)
        refreshMessage(channelId, id);
}

function restoreLocalEdit(messageId: string, channelId?: string) {
    const id = String(messageId).trim();
    if (!pluginStorage.edits?.[id]) return false;

    delete pluginStorage.edits[id];

    if (channelId)
        refreshMessage(channelId, id);

    return true;
}

function installMessageStorePatch() {
    const store = getMessageStore();
    if (!store || typeof store.getMessage !== "function")
        return false;

    patches.push(
        instead("getMessage", store, function (args: any[], original: Function) {
            const result = original.apply(this, args);
            return cloneWithLocalContent(result);
        })
    );

    // Some Discord versions expose getMessages() as an additional read path.
    if (typeof store.getMessages === "function") {
        patches.push(
            instead("getMessages", store, function (args: any[], original: Function) {
                const result = original.apply(this, args);

                if (!result) return result;

                if (Array.isArray(result))
                    return result.map(cloneWithLocalContent);

                if (Array.isArray(result._array))
                    return {
                        ...result,
                        _array: result._array.map(cloneWithLocalContent)
                    };

                return result;
            })
        );
    }

    return true;
}

function installCommands() {
    commands.push(registerCommand({
        name: "local-edit",
        description: "Locally replace another user's message on your device.",
        options: [
            {
                name: "message_id",
                description: "The Discord message ID.",
                type: 3,
                required: true
            },
            {
                name: "content",
                description: "The replacement text.",
                type: 3,
                required: true
            }
        ],
        execute: (args: any[], ctx: any) => {
            const id = String(args.find(a => a.name === "message_id")?.value ?? "");
            const content = String(args.find(a => a.name === "content")?.value ?? "");

            if (!id || !content) return { content: "Message ID and replacement text are required." };

            try {
                setLocalEdit(id, content, ctx?.channel?.id);
                showToast("Message edited locally.");
                return { content: "Edited locally. Discord's server message was not changed." };
            } catch (e) {
                return { content: `Local edit failed: ${String(e)}` };
            }
        }
    }));

    commands.push(registerCommand({
        name: "local-restore",
        description: "Restore a message's server-side text on your device.",
        options: [
            {
                name: "message_id",
                description: "The Discord message ID.",
                type: 3,
                required: true
            }
        ],
        execute: (args: any[], ctx: any) => {
            const id = String(args.find(a => a.name === "message_id")?.value ?? "");
            const restored = restoreLocalEdit(id, ctx?.channel?.id);

            if (restored) {
                showToast("Local message edit removed.");
                return { content: "Restored the server message locally." };
            }

            return { content: "No local edit exists for that message." };
        }
    }));
}

function onLoad() {
    initializeStorage();

    // The requested Discord Android build. The plugin remains defensive so
    // future/older builds fail closed instead of patching an unrelated module.
    if (BUILD !== 345009) {
        showToast(`Local Message Editor: tested for Discord ${BUILD}.`);
    }

    if (!installMessageStorePatch()) {
        RN.ToastAndroid?.show(
            "Local Message Editor: MessageStore was not found.",
            RN.ToastAndroid.LONG
        );
        return;
    }

    installCommands();
}

function onUnload() {
    for (const unpatch of patches.splice(0))
        unpatch();

    for (const unregister of commands.splice(0))
        unregister();
}

export default { onLoad, onUnload };
