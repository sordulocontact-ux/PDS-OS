import { can, type Access } from "@/lib/auth/access";

/**
 * Who may delete a call, for what the screen offers (« Supprimer la
 * réunion » in its « ⋯ »). The SQL function delete_call (20261107180101)
 * enforces it: the director (archive_records) deletes any call they see,
 * whoever works on a call (its project's owner, a meeting's creator)
 * deletes theirs.
 */
export type CallDeleter = {
  // The viewer may delete every call they see.
  all: boolean;
  personId: string | null;
};

export function callDeleter(access: Access): CallDeleter {
  return { all: can(access, "archive_records"), personId: access.personId };
}

export function canDeleteCall(
  deleter: CallDeleter,
  call: { ownerPersonId: string | null },
): boolean {
  return (
    deleter.all ||
    (deleter.personId !== null && call.ownerPersonId === deleter.personId)
  );
}
