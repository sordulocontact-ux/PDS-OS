// Projet collectif, lot 9 (docs/pds-mic-plan.md § 6, risque 5): a title
// abandoned leaves the counts of « all the titles » (the Master's steps and
// state, the engineer's invoice, the Distribution's checks) without being
// unlinked (its history is kept, its reactivation brings it back). Pure.

/** The project as the Master, the Distribution and the workflows' states
 * count its titles: its masters less those of abandoned titles. Unchanged
 * for any other project (none abandoned). */
export function countedTitlesProject<
  P extends { masters: Array<{ id: string }>; abandonedMasterIds: string[] },
>(project: P): P {
  if (project.abandonedMasterIds.length === 0) return project;
  const out = new Set(project.abandonedMasterIds);
  return {
    ...project,
    masters: project.masters.filter((master) => !out.has(master.id)),
  };
}
