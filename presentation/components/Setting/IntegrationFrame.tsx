import type {ReactNode} from "react";
import SettingHeader from "./SettingHeader";
export default function IntegrationFrame({children}:{children:ReactNode}){
 return <div className="flex min-w-0 flex-col"><SettingHeader icon="/misc/integration-icon.svg" title="Integrations"/><div className="min-w-0 rounded-2xl border border-primary-divider bg-background p-5 flex flex-col gap-5">{children}</div></div>;
}
