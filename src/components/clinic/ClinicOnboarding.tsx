import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Building2, Users, Plug, Rocket } from "lucide-react";
import { OnboardingBasicInfo } from "./OnboardingBasicInfo";
import { OnboardingChannels } from "./OnboardingChannels";
import { OnboardingAISetup } from "./OnboardingAISetup";
import { toast } from "sonner";

interface ClinicOnboardingProps {
  onComplete: (clinicId: string) => void;
}

type OnboardingStep = "info" | "channels" | "ai-setup" | "complete";

export const ClinicOnboarding = ({ onComplete }: ClinicOnboardingProps) => {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("info");
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [clinicName, setClinicName] = useState("");
  const [clinicType, setClinicType] = useState("medical");
  const [hasMinimumChannels, setHasMinimumChannels] = useState(false);
  const [hasPhoneConnection, setHasPhoneConnection] = useState(false);

  const steps = [
    { id: "info" as OnboardingStep, label: "Info", icon: Building2, description: "Basic details" },
    { id: "channels" as OnboardingStep, label: "Tools", icon: Plug, description: "Connect 2+ channels" },
    { id: "ai-setup" as OnboardingStep, label: "Assistant Intelligence", icon: Users, description: "Configure AI" },
    { id: "complete" as OnboardingStep, label: "Complete", icon: Rocket, description: "All set!" },
  ];

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const handleClinicCreated = (newClinicId: string, name: string, type: string) => {
    setClinicId(newClinicId);
    setClinicName(name);
    setClinicType(type);
    toast.success("Business profile created! Now connect at least 2 channels.");
    setCurrentStep("channels");
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

  const handleSkipOnboarding = () => {
    if (clinicId) {
      onComplete(clinicId);
      toast.info("You can complete setup anytime from Business Management");
    }
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
          <div className="space-y-4 sm:space-y-6">
            <div className="flex items-center gap-2 sm:gap-3 pb-3 sm:pb-4 border-b">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm sm:text-base">
                1
              </div>
              <h2 className="text-lg sm:text-xl font-semibold">Business Information</h2>
            </div>
            <OnboardingBasicInfo onComplete={handleClinicCreated} />
          </div>
        );

      case "channels":
        return (
          <div className="space-y-4 sm:space-y-6">
            <div className="flex items-center gap-2 sm:gap-3 pb-3 sm:pb-4 border-b">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm sm:text-base">
                2
              </div>
              <h2 className="text-lg sm:text-xl font-semibold">Connect Channels</h2>
            </div>
            {clinicId ? (
              <>
                <OnboardingChannels 
                  clinicId={clinicId} 
                  onChannelsConnected={(hasMinimum, hasPhone) => {
                    setHasMinimumChannels(hasMinimum);
                    setHasPhoneConnection(hasPhone || false);
                  }}
                />
                <div className="flex gap-3 pt-4">
                  <Button onClick={handleSkipOnboarding} variant="outline" className="flex-1">
                    Skip for Now
                  </Button>
                  <Button 
                    onClick={handleNext} 
                    className="flex-1"
                    disabled={!hasMinimumChannels}
                  >
                    {hasMinimumChannels ? "Continue to AI Setup" : "Connect at least 2 channels"}
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-center text-muted-foreground">Please complete business info first</p>
            )}
          </div>
        );

      case "ai-setup":
        return (
          <div className="space-y-4 sm:space-y-6">
            <div className="flex items-center gap-2 sm:gap-3 pb-3 sm:pb-4 border-b">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm sm:text-base">
                3
              </div>
              <h2 className="text-lg sm:text-xl font-semibold">Configure AI Assistant</h2>
            </div>
            {clinicId ? (
              <OnboardingAISetup 
                clinicId={clinicId}
                clinicType={clinicType}
                clinicName={clinicName}
                hasPhoneConnection={hasPhoneConnection}
                onComplete={handleNext}
              />
            ) : (
              <p className="text-center text-muted-foreground">Please complete previous steps first</p>
            )}
          </div>
        );

      case "complete":
        return (
          <div className="space-y-4 sm:space-y-6 text-center py-6 sm:py-12">
            <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-success/10 flex items-center justify-center mb-3 sm:mb-6">
              <CheckCircle2 className="h-8 w-8 sm:h-10 sm:w-10 text-success" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground px-4">You're All Set! 🎉</h2>
            <p className="text-sm sm:text-lg text-muted-foreground max-w-md mx-auto px-4">
              Your business is configured and ready. Your AI assistant will now help manage your front office operations.
            </p>
            
            <Card className="max-w-md mx-auto border-0 shadow-lg bg-gradient-to-br from-primary/10 to-secondary/10">
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-left text-base sm:text-lg">What's Next?</CardTitle>
              </CardHeader>
              <CardContent className="text-left space-y-2 sm:space-y-3">
                <div className="flex gap-2 sm:gap-3">
                  <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-success flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-xs sm:text-sm">Monitor your assistant</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">View tasks and communications in the dashboard</p>
                  </div>
                </div>
                <div className="flex gap-2 sm:gap-3">
                  <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-success flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-xs sm:text-sm">Add knowledge base</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Help your AI answer specific questions</p>
                  </div>
                </div>
                <div className="flex gap-2 sm:gap-3">
                  <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-success flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-xs sm:text-sm">Invite your team</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Collaborate with staff members</p>
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
    <div className="max-w-2xl mx-auto space-y-6 px-4 sm:px-0">
      {/* Step Indicators with numbered circles */}
      <div className="flex items-start justify-between gap-1 sm:gap-2 mb-8">
        {steps.slice(0, -1).map((step, index) => {
          const Icon = step.icon;
          const isCompleted = index < currentStepIndex;
          const isCurrent = index === currentStepIndex;
          
          return (
            <div key={step.id} className="flex-1 relative">
              <div className="flex flex-col items-center text-center">
                <div
                  className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center mb-2 font-semibold text-sm ${
                    isCompleted
                      ? "bg-primary text-primary-foreground"
                      : isCurrent
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {index + 1}
                </div>
                <p className={`text-xs sm:text-sm font-medium ${isCurrent ? "text-foreground" : "text-muted-foreground"} hidden sm:block`}>
                  {step.label}
                </p>
                <p className={`text-xs font-medium ${isCurrent ? "text-foreground" : "text-muted-foreground"} sm:hidden`}>
                  Step {index + 1}
                </p>
              </div>
              {/* Connector line */}
              {index < steps.length - 2 && (
                <div className={`absolute top-5 sm:top-6 left-1/2 w-full h-0.5 ${isCompleted ? "bg-primary" : "bg-muted"}`} style={{ marginLeft: '50%' }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <Card className="border-0 shadow-lg">
        <CardContent className="pt-6 px-4 sm:px-6">
          {renderStepContent()}
        </CardContent>
      </Card>
    </div>
  );
};
