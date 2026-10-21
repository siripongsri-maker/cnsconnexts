import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { LoadingScreen } from "./components/loading-screen";
import { pageTransitionTypes } from "./lib/motion";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultViewTransition: { types: pageTransitionTypes },
    defaultPreloadStaleTime: 0,
    defaultPendingComponent: LoadingScreen,
  });

  return router;
};
