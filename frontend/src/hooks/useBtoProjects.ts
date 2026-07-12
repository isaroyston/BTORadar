import { useEffect, useState } from "react";
import type { BtoProject } from "../policies/policyConfig";
import { getBtoDatasetCached } from "../policies/btoDatasource";

type BtoProjectsState =
  | { status: "loading"; projects: BtoProject[]; generatedAt: string | null; error: null }
  | { status: "ready"; projects: BtoProject[]; generatedAt: string | null; error: null }
  | { status: "error"; projects: BtoProject[]; generatedAt: string | null; error: string };

const LOAD_ERROR = "Unable to load BTO data right now.";

export function useBtoProjects() {
  const [state, setState] = useState<BtoProjectsState>({
    status: "loading",
    projects: [],
    generatedAt: null,
    error: null,
  });
  const [requestId, setRequestId] = useState(0);

  useEffect(() => {
    let isCurrent = true;

    getBtoDatasetCached()
      .then((dataset) => {
        if (!isCurrent) return;
        setState({
          status: "ready",
          projects: dataset.projects,
          generatedAt: dataset.generatedAt,
          error: null,
        });
      })
      .catch(() => {
        if (!isCurrent) return;
        setState((current) => ({
          status: "error",
          projects: current.projects,
          generatedAt: current.generatedAt,
          error: LOAD_ERROR,
        }));
      });

    return () => {
      isCurrent = false;
    };
  }, [requestId]);

  const retry = () => {
    setState((current) => ({
      status: "loading",
      projects: current.projects,
      generatedAt: current.generatedAt,
      error: null,
    }));
    setRequestId((id) => id + 1);
  };

  return {
    projects: state.projects,
    isLoading: state.status === "loading",
    error: state.status === "error" ? state.error : null,
    generatedAt: state.generatedAt,
    retry,
  };
}
