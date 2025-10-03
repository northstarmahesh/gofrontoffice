import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Building2, Users, Plug, Rocket } from "lucide-react";
import { ClinicProfile } from "./ClinicProfile";
import { TeamManagement } from "./TeamManagement";
import { ConnectedServices } from "./ConnectedServices";
import { toast } from "sonner";

interface ClinicOnboardingProps {
  onComplete: (clinicId: string) => void;
}

type OnboardingStep = "info" | "team" | "tools" | "complete";

export const ClinicOnboarding = ({ onComplete }: ClinicOnboardingProps) => {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("info");
  const [clinicId, setClinicId] = useState<string | null>(null);

  const steps = [
    { id: "info" as OnboardingStep, label: "Clinic Info", icon: Building2, description: "Tell us about your clinic" },
    { id: "team" as OnboardingStep, label: "Team", icon: Users, description: "Invite your team members" },
    { id: "tools" as OnboardingStep, label: "Connect Tools", icon: Plug, description: "Set up integrations" },
    { id: "complete" as OnboardingStep, label: "Get Started", icon: Rocket, description: "You're all set!" },
  ];

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const handleClinicCreated = (newClinicId: string) => {
    setClinicId(newClinicId);
    toast.success("Clinic profile created! Let's add your team.");
    setCurrentStep("team");
  };

  const handleNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex].id);
    }
  };

  const handleSkip = () => {
    handleNext();
  };

  const handleComplete = () => {
    if (clinicId) {
      onComplete(clinicId);
      toast.success("Welcome to Front Office! 🎉");
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case "info":
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold text-foreground mb-2">Welcome to Front Office! 👋</h2>
              <p className="text-lg text-muted-foreground">Let's set up your clinic in just a few steps</p>
            </div>
            <ClinicProfile onSaved={handleClinicCreated} />
          </div>
        );

      case "team":
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-foreground mb-2">Build Your Team</h2>
              <p className="text-muted-foreground">Add team members to help manage your clinic</p>
            </div>
            {clinicId ? (
              <>
                <TeamManagement clinicId={clinicId} />
                <div className="flex gap-3 pt-4">
                  <Button onClick={handleSkip} variant="outline" className="flex-1">
                    Skip for now
                  </Button>
                  <Button onClick={handleNext} className="flex-1">
                    Continue
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-center text-muted-foreground">Please complete clinic info first</p>
            )}
          </div>
        );

      case "tools":
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-foreground mb-2">Connect Your Tools</h2>
              <p className="text-muted-foreground">These integrations help your assistant work smarter</p>
            </div>
            <ConnectedServices />
            <div className="flex gap-3 pt-4">
              <Button onClick={handleSkip} variant="outline" className="flex-1">
                Skip for now
              </Button>
              <Button onClick={handleNext} className="flex-1">
                Continue
              </Button>
            </div>
          </div>
        );

      case "complete":
        return (
          <div className="space-y-6 text-center py-12">
            <div className="mx-auto w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mb-6">
              <CheckCircle2 className="h-10 w-10 text-success" />
            </div>
            <h2 className="text-3xl font-bold text-foreground">You're All Set! 🎉</h2>
            <p className="text-lg text-muted-foreground max-w-md mx-auto">
              Your clinic is configured and ready. Your AI assistant will now handle calls, messages, and help you manage your front office.
            </p>
            
            <Card className="max-w-md mx-auto border-0 shadow-lg bg-gradient-to-br from-primary/10 to-secondary/10">
              <CardHeader>
                <CardTitle className="text-left">What's Next?</CardTitle>
              </CardHeader>
              <CardContent className="text-left space-y-3">
                <div className="flex gap-3">
                  <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm">Configure your assistant</p>
                    <p className="text-xs text-muted-foreground">Set up phone modes and messaging channels</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm">Add knowledge base content</p>
                    <p className="text-xs text-muted-foreground">Help your assistant answer common questions</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm">Set your schedule</p>
                    <p className="text-xs text-muted-foreground">Let patients know when you're available</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button onClick={handleComplete} size="lg" className="mt-8">
              <Rocket className="mr-2 h-5 w-5" />
              Get Started
            </Button>
          </div>
        );
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">
            Step {currentStepIndex + 1} of {steps.length}
          </p>
          <p className="text-sm font-medium text-primary">{Math.round(progress)}% Complete</p>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Step Indicators */}
      <div className="flex items-center justify-between gap-2">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isCompleted = index < currentStepIndex;
          const isCurrent = index === currentStepIndex;
          
          return (
            <div
              key={step.id}
              className={`flex-1 text-center ${
                isCurrent ? "scale-105" : ""
              } transition-all`}
            >
              <div
                className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-2 ${
                  isCompleted
                    ? "bg-success text-success-foreground"
                    : isCurrent
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-6 w-6" />
                ) : (
                  <Icon className="h-6 w-6" />
                )}
              </div>
              <p
                className={`text-xs font-medium ${
                  isCurrent ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {step.label}
              </p>
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <Card className="border-0 shadow-lg">
        <CardContent className="pt-6">
          {renderStepContent()}
        </CardContent>
      </Card>
    </div>
  );
};
