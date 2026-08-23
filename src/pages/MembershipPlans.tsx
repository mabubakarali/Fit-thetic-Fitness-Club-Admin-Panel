import React, { useState } from 'react';
import { useGym } from '@/context/GymContext';
import { useToast } from '@/components/ui/Toast';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { MembershipPlan } from '@/types/database';
import { Layers, Plus, Edit2, CheckCircle, XCircle, Clock, Trash2, AlertCircle } from 'lucide-react';

export const MembershipPlans: React.FC = () => {
  const { plans, addPlan, updatePlan, deletePlan, settings } = useGym();
  const { showToast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<MembershipPlan | null>(null);
  const [planToDelete, setPlanToDelete] = useState<MembershipPlan | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [name, setName] = useState('');
  const [price, setPrice] = useState<number>(0);
  const [durationDays, setDurationDays] = useState<number>(30);
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currency = settings.currency || 'Rs.';

  const handleOpenCreate = () => {
    setEditingPlan(null);
    setName('');
    setPrice(2500);
    setDurationDays(30);
    setDescription('');
    setIsActive(true);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (plan: MembershipPlan) => {
    setEditingPlan(plan);
    setName(plan.name);
    setPrice(plan.price);
    setDurationDays(plan.duration_days);
    setDescription(plan.description || '');
    setIsActive(plan.is_active);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || price <= 0 || durationDays <= 0) {
      showToast('Validation Error', 'Please enter valid plan name, price, and duration', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingPlan) {
        await updatePlan(editingPlan.id, {
          name: name.trim(),
          price,
          duration_days: durationDays,
          description: description.trim() || undefined,
          is_active: isActive,
        });
        showToast('Plan Updated', `Plan ${name} updated successfully.`);
      } else {
        await addPlan({
          name: name.trim(),
          price,
          duration_days: durationDays,
          description: description.trim() || undefined,
          is_active: isActive,
        });
        showToast('Plan Created', `New membership plan ${name} added.`);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to save plan', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (plan: MembershipPlan) => {
    try {
      await updatePlan(plan.id, { is_active: !plan.is_active });
      showToast(
        plan.is_active ? 'Plan Disabled' : 'Plan Activated',
        `${plan.name} is now ${plan.is_active ? 'hidden from new registrations' : 'available'}.`
      );
    } catch (err: any) {
      showToast('Error', 'Failed to toggle plan status', 'error');
    }
  };

  const handleConfirmDeletePlan = async () => {
    if (!planToDelete) return;
    setIsDeleting(true);
    try {
      await deletePlan(planToDelete.id);
      showToast('Plan Deleted', `Membership plan ${planToDelete.name} has been removed.`);
      setPlanToDelete(null);
    } catch (err: any) {
      showToast('Delete Failed', err.message || 'Failed to delete plan', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <Layers className="h-6 w-6 text-emerald-500" /> Membership Plans
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure gym packages, custom durations in days, and pricing in {currency}.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={handleOpenCreate}
        >
          + Create New Plan
        </Button>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {plans.map((plan) => (
          <Card
            key={plan.id}
            className={`p-5 flex flex-col justify-between transition-all ${
              !plan.is_active ? 'opacity-60 bg-secondary/20' : 'hover:border-emerald-500/30'
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-base text-foreground">{plan.name}</h3>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{plan.duration_days} Days Duration</span>
                  </div>
                </div>
                <Badge variant={plan.is_active ? 'active' : 'neutral'} size="sm">
                  {plan.is_active ? 'Active' : 'Disabled'}
                </Badge>
              </div>

              <div className="pt-2">
                <span className="text-2xl font-black text-emerald-500">
                  {currency} {plan.price.toLocaleString()}
                </span>
                <span className="text-xs text-muted-foreground ml-1">/ cycle</span>
              </div>

              {plan.description && (
                <p className="text-xs text-muted-foreground leading-relaxed pt-1">
                  {plan.description}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 mt-4 border-t border-border/60">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => handleToggleActive(plan)}
                >
                  {plan.is_active ? 'Disable' : 'Enable'}
                </Button>
                <Button
                  variant="ghost"
                  size="xs"
                  className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 px-2"
                  onClick={() => setPlanToDelete(plan)}
                  title="Delete plan"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>

              <Button
                variant="outline"
                size="xs"
                leftIcon={<Edit2 className="h-3 w-3" />}
                onClick={() => handleOpenEdit(plan)}
              >
                Edit Plan
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPlan ? 'Edit Membership Plan' : 'Create New Membership Plan'}
        description="Specify plan name, duration in days, and fee amount."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Plan Name *"
            placeholder="e.g. Quarterly Special"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label={`Price (${currency}) *`}
              type="number"
              value={price || ''}
              onChange={(e) => setPrice(Number(e.target.value))}
              placeholder="3000"
            />

            <Input
              label="Duration in Days *"
              type="number"
              value={durationDays || ''}
              onChange={(e) => setDurationDays(Number(e.target.value))}
              placeholder="30"
              helperText="e.g. 30 (1 mo), 90 (3 mo), 365 (1 yr)"
            />
          </div>

          <Input
            label="Plan Description"
            placeholder="e.g. Full facility access + 1 free personal session"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-foreground pt-2">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded border-border text-emerald-600 focus:ring-emerald-500 h-4 w-4"
            />
            Plan is Active for Registration
          </label>

          <div className="flex justify-end gap-3 pt-4 border-t border-border/60">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              {editingPlan ? 'Save Changes' : 'Create Plan'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Plan Confirmation Modal */}
      <Modal
        isOpen={Boolean(planToDelete)}
        onClose={() => setPlanToDelete(null)}
        title="Delete Membership Plan"
        description="Are you sure you want to remove this package?"
        maxWidth="md"
      >
        {planToDelete && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 space-y-2">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>Confirm Plan Deletion</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Delete plan <strong>{planToDelete.name}</strong> ({currency} {planToDelete.price.toLocaleString()} for {planToDelete.duration_days} days).
              </p>
              <p className="text-[11px] text-muted-foreground">
                Existing members who joined under this plan will keep their historical record, but new registrations won't be able to select it.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-border/60">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => setPlanToDelete(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                size="md"
                leftIcon={<Trash2 className="h-4 w-4" />}
                isLoading={isDeleting}
                onClick={handleConfirmDeletePlan}
              >
                Confirm Delete
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
