import { AcademyOnboardingWizard } from "./AcademyOnboardingWizard";
import { listWebsiteTemplates } from "@/modules/sites/template-service";
import { listSaaSPlans } from "@/modules/platform/saas.repository";
export default async function NewAcademyPage(){const [templates,plans]=await Promise.all([listWebsiteTemplates(),listSaaSPlans(true)]);return <div><h1 className="text-2xl font-bold">Create a managed academy website</h1><p className="mt-1 mb-7 text-sm text-[var(--color-muted)]">From academy details to a published branded website in one guided flow.</p><AcademyOnboardingWizard templates={templates} plans={plans.map(p=>({id:p.id,name:p.name}))}/></div>}
