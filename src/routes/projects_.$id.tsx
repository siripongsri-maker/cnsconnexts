import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowUpRight, Mail, MapPin, Phone, UserRound } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { IssueBlock } from "@/components/power-bits";
import { projectQueryOptions } from "@/lib/projects-query";
import { contactLinks } from "@/lib/project-contact";
import { KNS_PROJECT_SOURCES } from "@/lib/kns-project-sources";
import { provinceTh, regionLabel } from "@/lib/i18n";
import type { Region } from "@/lib/types";

export const Route = createFileRoute("/projects_/$id")({
  loader: async ({ params, context }) => {
    if (!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(params.id)) throw notFound();
    const project = await context.queryClient.ensureQueryData(projectQueryOptions(params.id));
    if (!project) throw notFound();
    return project;
  },
  head: ({ loaderData: project }) => {
    const title = project ? `${project.name} — คนส. Connexts` : "รายละเอียดโปรเจกต์ — คนส. Connexts";
    const description = project?.summary || "รายละเอียดผลงานและช่องทางติดต่อทีมโปรเจกต์ คนส. Connexts";
    const image = project?.photo?.startsWith("https://") ? project.photo : undefined;
    return { meta: [
      { title }, { name: "description", content: description },
      { property: "og:title", content: title }, { property: "og:description", content: description },
      { property: "og:type", content: "article" }, { name: "twitter:card", content: "summary_large_image" },
      ...(!project ? [{ name: "robots", content: "noindex" }] : []),
      ...(image ? [{ property: "og:image", content: image }, { name: "twitter:image", content: image }] : []),
    ] };
  },
  component: ProjectDetail,
  notFoundComponent: () => <AppShell title="ไม่พบโปรเจกต์"><p className="mb-5 text-body text-muted-foreground">โปรเจกต์นี้อาจถูกนำออกแล้ว</p><BackToProjects /></AppShell>,
  errorComponent: ProjectError,
});

function BackToProjects() {
  return <Button asChild variant="outline" className="min-h-12 text-body"><Link to="/projects"><ArrowLeft aria-hidden />กลับไปโปรเจกต์</Link></Button>;
}

function ProjectError() {
  const router = useRouter();
  return <AppShell title="โหลดโปรเจกต์ไม่สำเร็จ"><p role="alert" className="mb-5 text-body">กรุณาลองอีกครั้ง</p><div className="flex flex-wrap gap-3"><Button className="min-h-12 text-body" onClick={() => void router.invalidate()}>ลองอีกครั้ง</Button><BackToProjects /></div></AppShell>;
}

function ProjectDetail() {
  const { id } = Route.useParams();
  const { data: project } = useSuspenseQuery(projectQueryOptions(id));
  if (!project) return null;
  const links = contactLinks(project);
  const source = KNS_PROJECT_SOURCES[id];
  return <AppShell title="รายละเอียดโปรเจกต์" subtitle={`${project.course} · ${project.batch || "ไม่ระบุรุ่น"}`}>
    <article className="space-y-7 pb-8">
      <BackToProjects />
      <header className="space-y-4 border-b border-border pb-6">
        <p className="text-body font-semibold text-primary">{project.course} · {project.batch || "ไม่ระบุรุ่น"}</p>
        <h1 className="font-heading text-title font-semibold break-words text-ink">{project.name}</h1>
        <p className="flex items-start gap-2 text-body text-ink-soft"><MapPin className="mt-1 size-5 shrink-0" aria-hidden />{project.province ? provinceTh(project.province) : regionLabel(project.region as Region)}</p>
        <div className="flex flex-wrap gap-2">{project.policy_issues.map(issue => <IssueBlock key={issue} issue={issue} />)}</div>
        {(project.stage_ready || project.showcase) && <p className="text-body font-semibold text-primary">{project.showcase ? "ผลงานคัดสรรสำหรับนำเสนอ" : "ยินดีขึ้นเวทีนำเสนอ"}</p>}
      </header>
      {project.photo && <figure className="space-y-2"><a href={project.photo} target="_blank" rel="noreferrer"><img src={project.photo} alt={`ภาพผลงาน ${project.name}`} className="max-h-[640px] w-full rounded-md border border-border object-contain" /></a><figcaption className="text-body text-ink-soft">{project.name}</figcaption></figure>}
      <DetailSection title="รายละเอียดและแนวทางดำเนินงาน" content={project.summary || "ยังไม่ได้ระบุรายละเอียด"} />
      <DetailSection title="ผลงานเด่นและผลลัพธ์" content={project.highlight || "ยังไม่ได้ระบุผลงานเด่น"} />
      <DetailSection title="สิ่งที่อยากชวนร่วม / การสนับสนุนที่ต้องการ" content={project.wanted || "ยังไม่ได้ระบุการสนับสนุนที่ต้องการ"} />
      {source && <section className="border-t border-border pt-6"><h2 className="mb-3 font-heading text-lead font-semibold text-ink">เอกสารและภาพเพิ่มเติม</h2><Button asChild variant="outline" className="min-h-12 max-w-full whitespace-normal text-body"><a href={source} target="_blank" rel="noreferrer">เปิดเอกสารต้นฉบับ<ArrowUpRight aria-hidden /></a></Button></section>}
      <section className="border-t border-border pt-6" aria-labelledby="project-contact">
        <h2 id="project-contact" className="mb-4 flex items-center gap-2 font-heading text-lead font-semibold text-ink"><UserRound className="size-5" aria-hidden />ผู้รับผิดชอบและช่องทางติดต่อ</h2>
        {project.contact_name && <p className="text-body font-semibold break-words">{project.contact_name}</p>}
        {project.contact_organization && <p className="mt-1 text-body break-words text-ink-soft">{project.contact_organization}</p>}
        {links.length ? <div className="mt-4 flex flex-col items-start gap-3">{links.map(link => <Button key={link.kind} asChild variant="outline" className="min-h-12 max-w-full whitespace-normal break-all text-left text-body"><a href={link.href} target={link.kind === "url" ? "_blank" : undefined} rel={link.kind === "url" ? "noreferrer" : undefined}>{link.kind === "phone" ? <Phone aria-hidden /> : link.kind === "email" ? <Mail aria-hidden /> : <ArrowUpRight aria-hidden />}{link.label}</a></Button>)}</div> : <p className="mt-3 text-body text-ink-soft">ยังไม่มีช่องทางติดต่อที่เผยแพร่สำหรับโปรเจกต์นี้</p>}
      </section>
    </article>
  </AppShell>;
}

function DetailSection({ title, content }: { title: string; content: string }) {
  return <section className="space-y-3"><h2 className="font-heading text-lead font-semibold text-ink">{title}</h2><p className="whitespace-pre-wrap text-body leading-relaxed break-words text-ink-soft">{content}</p></section>;
}