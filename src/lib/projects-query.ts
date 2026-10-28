import { queryOptions } from "@tanstack/react-query";
import { getPublicProject } from "@/lib/projects.functions";

export const projectQueryOptions = (id: string) => queryOptions({
  queryKey: ["public-project", id],
  queryFn: () => getPublicProject({ data: { id } }),
  staleTime: 0,
});