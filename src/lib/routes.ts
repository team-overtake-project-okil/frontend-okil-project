import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetcher } from "./fetcher";

type Route = { id: number; name: string };

const routeIds = Array.from({ length: 10 }, (_, index) => 256 + index);

export function useRoutes() {
  const { data } = useQuery({
    queryKey: ["routes", routeIds],
    queryFn: () =>
      Promise.all(
        routeIds.map(
          (routeId) => fetcher(`/routes/${routeId}`) as Promise<Route>,
        ),
      ),
  });

  useEffect(() => {
    data?.forEach((route) => console.log({ id: route.id, name: route.name }));
  }, [data]);
}
