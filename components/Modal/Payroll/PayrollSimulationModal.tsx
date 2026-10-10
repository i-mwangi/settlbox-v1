"use client";
import React, { useState, useMemo, useCallback } from "react";
import { ModalProp } from "@/contexts/ModalManagerProvider";
import { PayrollSimulationModalProps } from "@/types/modal";
import BaseModal from "../BaseModal";
import { ModalHeader } from "@/components/Common/ModalHeader";
import { SecondaryButton } from "@/components/Common/SecondaryButton";
import { PrimaryButton } from "@/components/Common/PrimaryButton";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface SimEmployee {
  role: string;
  monthlyCost: number;
}

const ROLE_PRESETS = [
  { role: "Junior", cost: 5000 },
  { role: "Mid-level", cost: 8000 },
  { role: "Senior", cost: 12000 },
  { role: "Lead", cost: 15000 },
  { role: "Manager", cost: 18000 },
];

const SALARY_MIN = 1000;
const SALARY_MAX = 25000;
const SALARY_STEP = 500;

function formatCurrency(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function PayrollSimulationModal({
  isOpen,
  onClose,
  zIndex,
  treasuryBalance,
  avgMonthlyBurn,
  currentRunwayMonths,
  currentEmployees,
  onApply,
}: ModalProp<PayrollSimulationModalProps>) {
  const [employees, setEmployees] = useState<SimEmployee[]>(currentEmployees ?? []);
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [salary, setSalary] = useState(8000);
  const [headcount, setHeadcount] = useState(1);

  const simExtraBurn = useMemo(() => employees.reduce((sum, e) => sum + e.monthlyCost, 0), [employees]);
  const totalBurn = avgMonthlyBurn + simExtraBurn;
  const simRunway = useMemo(
    () => (totalBurn > 0 ? Math.floor(treasuryBalance / totalBurn) : 0),
    [treasuryBalance, totalBurn],
  );

  const chartData = useMemo(() => {
    const months = Math.max(currentRunwayMonths, simRunway, 12) + 2;
    const now = new Date();
    return Array.from({ length: Math.min(months, 36) }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      const current = Math.max(treasuryBalance - avgMonthlyBurn * i, 0);
      const simulated = simExtraBurn > 0 ? Math.max(treasuryBalance - totalBurn * i, 0) : undefined;
      return {
        month: label,
        Current: Math.round(current),
        ...(simulated !== undefined ? { Simulated: Math.round(simulated) } : {}),
      };
    });
  }, [treasuryBalance, avgMonthlyBurn, totalBurn, simExtraBurn, currentRunwayMonths, simRunway]);

  const handlePresetClick = useCallback((preset: (typeof ROLE_PRESETS)[number]) => {
    setSelectedPreset(preset.cost);
    setSalary(preset.cost);
  }, []);

  const handleAdd = () => {
    const role = ROLE_PRESETS.find((p) => p.cost === selectedPreset)?.role ?? "Custom";
    for (let i = 0; i < headcount; i++) {
      setEmployees((prev) => [...prev, { role: headcount > 1 ? `${role} #${prev.length + 1}` : role, monthlyCost: salary }]);
    }
    setSelectedPreset(null);
    setHeadcount(1);
  };

  const handleRemove = (index: number) => {
    setEmployees((prev) => prev.filter((_, i) => i !== index));
  };

  const handleApply = () => {
    onApply(employees);
    onClose();
  };

  const handleReset = () => {
    setEmployees([]);
    setSelectedPreset(null);
    setSalary(8000);
    setHeadcount(1);
  };

  if (!isOpen) return null;

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} zIndex={zIndex}>
      <ModalHeader title="Payroll Simulation" onClose={onClose} />
      <div className="bg-background rounded-b-2xl w-[680px] max-h-[85vh] overflow-y-auto border-2 border-t-0 border-primary-divider">
        {/* Stats bar */}
        <div className="flex items-center gap-4 px-5 py-3 border-b border-primary-divider bg-app-background">
          <div className="flex-1">
            <p className="text-xs text-text-secondary">Treasury</p>
            <p className="text-sm font-medium text-text-primary">{formatCurrency(treasuryBalance)}</p>
          </div>
          <div className="flex-1">
            <p className="text-xs text-text-secondary">Monthly Burn</p>
            <p className="text-sm font-medium text-text-primary">{formatCurrency(avgMonthlyBurn)}</p>
          </div>
          <div className="flex-1">
            <p className="text-xs text-text-secondary">Current Runway</p>
            <p className="text-sm font-medium text-text-primary">{currentRunwayMonths} months</p>
          </div>
          {simExtraBurn > 0 && (
            <div className="flex-1">
              <p className="text-xs text-text-secondary">Projected</p>
              <p className={`text-sm font-medium ${simRunway < currentRunwayMonths ? "text-badge-fail-text" : "text-text-primary"}`}>
                {simRunway} months
              </p>
            </div>
          )}
        </div>

        <div className="p-5 flex flex-col gap-5">
          {/* Role presets */}
          <div>
            <p className="text-sm text-text-secondary mb-2">Select a role</p>
            <div className="flex flex-wrap gap-2">
              {ROLE_PRESETS.map((preset) => (
                <button
                  key={preset.role}
                  onClick={() => handlePresetClick(preset)}
                  className={`px-4 py-2 rounded-xl border text-sm font-medium transition-colors cursor-pointer ${
                    selectedPreset === preset.cost
                      ? "border-[var(--primary-blue)] bg-[var(--primary-blue)]/10 text-[var(--primary-blue)]"
                      : "border-primary-divider bg-app-background text-text-primary hover:border-text-secondary"
                  }`}
                >
                  {preset.role}
                  <span className="text-text-secondary ml-1.5">{formatCurrency(preset.cost)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Salary slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-text-secondary">Monthly salary</p>
              <p className="text-sm font-medium text-text-primary">{formatCurrency(salary)}</p>
            </div>
            <input
              type="range"
              min={SALARY_MIN}
              max={SALARY_MAX}
              step={SALARY_STEP}
              value={salary}
              onChange={(e) => {
                setSalary(Number(e.target.value));
                setSelectedPreset(null);
              }}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-[var(--primary-blue)] bg-primary-divider"
            />
            <div className="flex justify-between mt-1">
              <span className="text-xs text-text-secondary">{formatCurrency(SALARY_MIN)}</span>
              <span className="text-xs text-text-secondary">{formatCurrency(SALARY_MAX)}</span>
            </div>
          </div>

          {/* Headcount slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-text-secondary">Number of hires</p>
              <p className="text-sm font-medium text-text-primary">{headcount}</p>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              step={1}
              value={headcount}
              onChange={(e) => setHeadcount(Number(e.target.value))}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-[var(--primary-blue)] bg-primary-divider"
            />
            <div className="flex justify-between mt-1">
              <span className="text-xs text-text-secondary">1</span>
              <span className="text-xs text-text-secondary">10</span>
            </div>
          </div>

          {/* Add button */}
          <SecondaryButton
            text={`Add ${headcount} hire${headcount > 1 ? "s" : ""} (+${formatCurrency(salary * headcount)}/mo)`}
            variant="dark"
            onClick={handleAdd}
          />

          {/* Simulated employees */}
          {employees.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-text-secondary">Simulated hires ({employees.length})</p>
                <button onClick={handleReset} className="text-xs text-badge-fail-text cursor-pointer hover:underline">
                  Clear all
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {employees.map((emp, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary-divider bg-app-background"
                  >
                    <span className="text-sm text-text-primary">{emp.role}</span>
                    <span className="text-xs text-text-secondary">{formatCurrency(emp.monthlyCost)}/mo</span>
                    <button
                      onClick={() => handleRemove(i)}
                      className="text-text-secondary hover:text-badge-fail-text text-xs ml-0.5 cursor-pointer"
                    >
                      x
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-text-secondary mt-2">
                +{formatCurrency(simExtraBurn)}/mo total new payroll
              </p>
            </div>
          )}

          {/* Runway chart */}
          <div>
            <p className="text-sm text-text-secondary mb-2">Runway projection</p>
            <div className="h-56 bg-app-background rounded-xl p-3 border border-primary-divider">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--primary-divider)" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "var(--text-secondary)", fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--text-secondary)", fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    content={({ active, payload, label }: any) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div className="bg-background rounded-[8px] p-3 border border-primary-divider shadow-lg">
                          <p className="text-text-primary text-xs font-medium mb-1">{label}</p>
                          {payload.map((entry: any, i: number) => (
                            <div key={i} className="flex items-center gap-2 text-sm">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                              <span className="text-text-secondary">{entry.name}:</span>
                              <span className="text-text-primary font-medium">{formatCurrency(entry.value)}</span>
                            </div>
                          ))}
                        </div>
                      );
                    }}
                  />
                  <ReferenceLine y={0} stroke="var(--primary-divider)" />
                  <Line type="monotone" dataKey="Current" stroke="#4CAF50" strokeWidth={2} dot={false} name="Current Burn" />
                  {simExtraBurn > 0 && (
                    <Line type="monotone" dataKey="Simulated" stroke="#F44336" strokeWidth={2} strokeDasharray="6 3" dot={false} name="With New Hires" />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
            {simExtraBurn > 0 && (
              <div className="flex items-center gap-5 mt-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-[#4CAF50] rounded-full" />
                  <span className="text-xs text-text-secondary">Current: {currentRunwayMonths}mo</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-[#F44336] rounded-full" />
                  <span className="text-xs text-text-secondary">Projected: {simRunway}mo</span>
                </div>
                <span className="text-xs text-text-secondary">({currentRunwayMonths - simRunway}mo shorter)</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-row gap-2 w-full items-center pt-2">
            <SecondaryButton text="Cancel" onClick={onClose} variant="light" />
            <PrimaryButton text="Apply Simulation" onClick={handleApply} />
          </div>
        </div>
      </div>
    </BaseModal>
  );
}

export default PayrollSimulationModal;
