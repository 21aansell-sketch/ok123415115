import { ReactNative as RN } from "@vendetta/metro/common";
import { useProxy } from "@vendetta/storage";
import { Forms } from "@vendetta/ui/components";

import { pluginStorage } from "./state";

const { FormInput, FormRow, FormSection, FormSwitchRow } = Forms;

export default function Settings() {
    useProxy(pluginStorage);

    return (
        <RN.ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 38 }}>
            <FormSection title="Shared plugin template" titleStyleType="no_border">
                <FormSwitchRow
                    label="Show start message"
                    value={pluginStorage.showStartMessage}
                    onValueChange={(value: boolean) => { pluginStorage.showStartMessage = value; }}
                />
                <FormRow label="Shared message" />
                <FormInput
                    title=""
                    value={pluginStorage.message}
                    onChange={(value: string) => { pluginStorage.message = value; }}
                    style={{ marginTop: -25, marginHorizontal: 12 }}
                />
            </FormSection>
        </RN.ScrollView>
    );
}
