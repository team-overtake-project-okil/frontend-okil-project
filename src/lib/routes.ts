import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetcher } from "./fetcher";

type Route = { id: number; name: string };

export function useRoutes() {
  const { data } = useQuery({
    queryKey: ["routes"],
    queryFn: () => fetcher("/routes") as Promise<Route[]>,
  });

  useEffect(() => {
    data?.slice(0, 10).forEach((route) => console.log(route.id, route.name));
  }, [data]);
}
