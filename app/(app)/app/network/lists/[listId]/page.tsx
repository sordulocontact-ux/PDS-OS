import { IconUnorderedList } from "nucleo-sharp-essential";

import { FormMessage } from "@/components/auth/form-message";
import { AddPeopleButton } from "@/components/network/lists/add-people-button";
import { ListActions } from "@/components/network/lists/list-actions";
import {
  ListContacts,
  type ListContact,
} from "@/components/network/lists/list-contacts";
import { BackLink } from "@/components/shell/back-link";
import { EmptyState } from "@/components/shell/empty-state";
import { SectionFrame } from "@/components/shell/section-frame";
import { StatusBadge } from "@/components/ui/status-badge";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import { getNetworkList } from "@/lib/network/lists";
import { networkListRoutes } from "@/lib/network/lists-types";
import { listNetworkContacts } from "@/lib/network/queries";
import { rolesText } from "@/lib/network/types";
import { networkListStateTone } from "@/lib/ui/state-tones";
import { allInOrder } from "@/lib/utils/parallel";

export async function generateMetadata({
  params,
}: PageProps<"/app/network/lists/[listId]">) {
  const { listId } = await params;
  const list = await getNetworkList(listId);
  return {
    title: `${list?.name ?? fr.network.lists.title} · ${fr.app.name}`,
  };
}

/**
 * A list of the Réseau (Ibé, 18/11/2026): its name and state, its people
 * by name with their reply. Its author, and the team once it is shared,
 * keep it up (who manages the Réseau); the direction validates a shared
 * list; who creates projects makes one from its artists of the Catalogue.
 * The people are read from the Réseau with the viewer's session: a private
 * contact's coordinates stay hidden; an archived contact is not shown.
 */
export default async function NetworkListPage({
  params,
}: PageProps<"/app/network/lists/[listId]">) {
  const { listId } = await params;
  const [access, list, network] = await allInOrder([
    requireApproved(),
    getNetworkList(listId),
    listNetworkContacts(false),
  ]);
  // The layout answered 404 already; a list deleted meanwhile reads empty.
  if (!list) return null;
  const t = fr.network.lists;
  const manages = can(access, "manage_network");
  const author = list.owner.personId === access.personId;
  const rights = {
    people: manages && (author || list.shared),
    author: manages && author,
    validate: can(access, "validate") && list.shared,
  };
  const byId = new Map((network ?? []).map((c) => [c.id, c]));
  const contacts: ListContact[] = list.members
    .flatMap((m) => {
      const contact = byId.get(m.contactId);
      return contact ? [{ ...contact, reply: m.reply }] : [];
    })
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));
  const people = rights.people
    ? {
        options: (network ?? []).map((c) => ({
          id: c.id,
          label: c.name,
          detail: rolesText(c.roles) || undefined,
        })),
        inList: list.members.map((m) => m.contactId),
      }
    : null;
  const createProjectHref =
    can(access, "create_projects") && contacts.some((c) => c.artistId)
      ? networkListRoutes.project(list.id)
      : null;

  return (
    <SectionFrame
      list={false}
      className="max-w-5xl"
      above={<BackLink href={networkListRoutes.lists}>{t.back}</BackLink>}
      title={list.name}
      badge={
        <StatusBadge tone={networkListStateTone[list.state]}>
          {t.states[list.state]}
        </StatusBadge>
      }
      action={
        <ListActions
          list={list}
          rights={rights}
          people={contacts.length > 0 ? people : null}
          createProjectHref={createProjectHref}
        />
      }
    >
      {!network ? (
        <FormMessage kind="error">{t.loadError}</FormMessage>
      ) : contacts.length === 0 ? (
        <EmptyState
          icon={IconUnorderedList}
          title={t.empty.people.title}
          body={people ? t.empty.people.body : t.empty.people.readOnly}
          action={
            people ? (
              <AddPeopleButton
                listId={list.id}
                listName={list.name}
                options={people.options}
                inList={people.inList}
              />
            ) : null
          }
        />
      ) : (
        <ListContacts
          listId={list.id}
          contacts={contacts}
          canWrite={rights.people}
        />
      )}
    </SectionFrame>
  );
}
