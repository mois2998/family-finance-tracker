'use client';

import React, { useState } from 'react';
import { UpcomingExpenseProjection } from '@/lib/forecasting';
import { CalendarClock, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface UpcomingExpensesPanelProps {
  upcoming: UpcomingExpenseProjection[];
  onConfirmPaid: (recurringId: string, actualAmount: number) => Promise<void>;
  currency?: string;
}

export default function UpcomingExpensesPanel({
  upcoming,
  onConfirmPaid,
  currency = '₹',
}: UpcomingExpensesPanelProps) {
  const [selectedForPayment, setSelectedForPayment] = useState<UpcomingExpenseProjection | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleOpenPayModal = (item: UpcomingExpenseProjection) => {
    setSelectedForPayment(item);
    setPaymentAmount(item.amount.toString());
  };

  const handleConfirmSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedForPayment || !selectedForPayment.recurringExpenseId) return;

    setProcessingId(selectedForPayment.recurringExpenseId);
    try {
      await onConfirmPaid(selectedForPayment.recurringExpenseId, parseFloat(paymentAmount));
      setSelectedForPayment(null);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="bg-[#0f172a]/80 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/20">
              <CalendarClock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                Upcoming Due Bills & Recharges
              </h3>
              <p className="text-xs text-slate-400">Next 45 days predicted cash commitments</p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
            {upcoming.length} upcoming
          </span>
        </div>

        {upcoming.length === 0 ? (
          <div className="py-8 text-center text-slate-400 border border-dashed border-slate-800 rounded-xl my-2">
            <Clock className="w-8 h-8 mx-auto mb-2 text-slate-600" />
            <p className="text-sm font-medium text-slate-300">No upcoming commitments scheduled</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Add a recurring bill or recharge to see predicted due dates here.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
            {upcoming.map((item) => {
              const isDueVerySoon = item.daysUntilDue <= 3;
              return (
                <div
                  key={item.id}
                  className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                    isDueVerySoon
                      ? 'bg-amber-950/20 border-amber-500/40 hover:bg-amber-950/30'
                      : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-850 hover:border-slate-700'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-white truncate">{item.name}</p>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700 shrink-0">
                        {item.frequency}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                      <span>{item.category}</span>
                      <span>•</span>
                      <span className={isDueVerySoon ? 'text-amber-400 font-semibold' : ''}>
                        {item.daysUntilDue === 0
                          ? 'Due Today!'
                          : item.daysUntilDue === 1
                          ? 'Due Tomorrow'
                          : `In ${item.daysUntilDue} days (${format(new Date(item.dueDate), 'MMM d')})`}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-bold text-white">
                      {currency}
                      {item.amount.toLocaleString('en-IN')}
                    </span>
                    {item.recurringExpenseId && (
                      <button
                        onClick={() => handleOpenPayModal(item)}
                        className="px-2.5 py-1 text-xs font-semibold bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 rounded-lg flex items-center gap-1 transition-colors"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Pay</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pay / Confirm Modal */}
      {selectedForPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm bg-[#0f172a] border border-slate-700 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle className="w-5 h-5" />
              <h4 className="text-base font-bold text-white">Confirm Recurring Payment</h4>
            </div>

            <p className="text-xs text-slate-300">
              Marking <strong className="text-white">{selectedForPayment.name}</strong> as paid will log an expense
              for today and automatically roll the next due date forward by {selectedForPayment.frequency}.
            </p>

            <form onSubmit={handleConfirmSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Actual Amount Paid ({currency})
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold text-base focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedForPayment(null)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processingId !== null}
                  className="px-4 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-md disabled:opacity-50"
                >
                  {processingId ? 'Processing...' : 'Confirm & Log'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
