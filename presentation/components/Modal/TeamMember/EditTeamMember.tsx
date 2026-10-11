"use client";
import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { EditTeamMemberProps, MODAL_IDS } from "@/presentation/types/modal";
import {
  ModalProp,
  useModal,
} from "@/presentation/contexts/ModalManagerProvider";
import BaseModal from "../BaseModal";
import { SecondaryButton } from "@/presentation/components/Common/SecondaryButton";
import { PrimaryButton } from "@/presentation/components/Common/PrimaryButton";
import { ModalHeader } from "@/presentation/components/Common/ModalHeader";
import InputFilled from "@/presentation/components/Common/Input/InputFilled";
import {
  useGetTeamMemberById,
  useUpdateTeamMember,
} from "@/presentation/services/api/team-member";
import toast from "react-hot-toast";
import { TeamMemberRoleDropdown } from "@/presentation/components/Common/Dropdown/TeamMemberRoleDropdown";
import { TeamMemberRoleEnum } from "@/presentation/types/enums";
import { useAuth } from "@/presentation/services/auth/context";
export function EditTeamMember({
  isOpen,
  onClose,
  zIndex,
  id,
}: ModalProp<EditTeamMemberProps>) {
  const { user } = useAuth();
  const { openModal } = useModal();
  const { register, handleSubmit, reset } = useForm<{
    position: string;
  }>({ defaultValues: { position: "" } });
  const { data: teamMember, isLoading } = useGetTeamMemberById(id, {
    enabled: !!id,
  });
  const updateTeamMember = useUpdateTeamMember();
  const [selectedRole, setSelectedRole] = React.useState<
    TeamMemberRoleEnum | undefined
  >(undefined);
  useEffect(() => {
    reset({ position: teamMember?.position ?? "" });
    setSelectedRole(
      (teamMember?.role as TeamMemberRoleEnum) ?? TeamMemberRoleEnum.VIEWER,
    );
  }, [teamMember]);
  const onSubmit = async (values: { position: string }) => {
    if (!id) return;
    try {
      await updateTeamMember.mutateAsync({
        teamMemberId: id,
        updateDto: {
          position: values.position,
          ...(selectedRole && selectedRole !== teamMember?.role
            ? { role: selectedRole }
            : {}),
        },
      });
      toast.success("Team member updated successfully");
      onClose();
    } catch (err) {
      console.error("Failed to update team member", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to update team member",
      );
    }
  };
  const memberName = teamMember
    ? `${teamMember.firstName} ${teamMember.lastName}`.trim()
    : "";
  const memberEmail = teamMember?.user?.email || "";
  return (
    <BaseModal isOpen={isOpen} onClose={onClose} zIndex={zIndex}>
      <div className="flex w-125 flex-col rounded-[20px] pb-5">
        <ModalHeader title="Edit team member" onClose={onClose} />

        <div className="flex flex-col gap-10 items-start p-4 w-full border-t border-2 border-primary-divider bg-background rounded-b-2xl">
          {isLoading ? (
            <p className="text-sm text-text-secondary">Loading...</p>
          ) : (
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="w-full flex flex-col gap-3"
            >
              <div className="flex flex-col gap-2 w-full">
                <p className="font-barlow font-semibold text-2xl leading-none">
                  {memberName}
                </p>
                <p className="font-barlow text-sm font-normal leading-none">
                  {memberEmail}
                </p>
              </div>

              {user?.teamMembership?.role === TeamMemberRoleEnum.OWNER &&
                user?.email !== teamMember?.user?.email && (
                  <TeamMemberRoleDropdown
                    selectedRole={selectedRole as TeamMemberRoleEnum}
                    onRoleSelect={(role) => setSelectedRole(role)}
                    variant="filled"
                  />
                )}

              <InputFilled
                label="Label"
                placeholder="Enter position"
                {...register("position", { maxLength: 100 })}
              />

              <div className="flex gap-3 items-center w-full">
                <SecondaryButton
                  onClick={() =>
                    openModal(MODAL_IDS.DISCARD_CHANGES, { onConfirm: onClose })
                  }
                  buttonClassName="flex-1"
                  variant="light"
                  text="Cancel"
                  type="button"
                />
                <PrimaryButton
                  containerClassName="flex-1"
                  text="Save changes"
                  type="submit"
                  loading={updateTeamMember.isPending}
                  disabled={updateTeamMember.isPending}
                />
              </div>
            </form>
          )}
        </div>
      </div>
    </BaseModal>
  );
}
export default EditTeamMember;
