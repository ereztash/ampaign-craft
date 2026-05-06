// Pulse boundary: re-exports the generator function from pulseEngine.
// The WeeklyPulse, PulseAction, LossFramedMessage types live in next-step.vm.

export { generateWeeklyPulse } from "@/engine/pulseEngine";
