import React from 'react';
import { Button } from '@/components/shared/ui/button';

interface Step {
  title: string;
  instructions: string;
}

interface StepGuideProps {
  steps: Step[];
  currentStep: number;
  onStepChange: (step: number) => void;
}

export default function StepGuide({ steps, currentStep, onStepChange }: StepGuideProps) {
  return (
    <div className="mt-8">
      <h2 className="text-2xl font-semibold mb-4">Step-by-Step Guide</h2>
      <div className="bg-gray-100 p-4 rounded-md">
        <h3 className="text-xl font-semibold mb-2">{steps[currentStep].title}</h3>
        <p className="mb-4">{steps[currentStep].instructions}</p>
        <div className="flex justify-between">
          <Button 
            onClick={() => onStepChange(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
          >
            Previous
          </Button>
          <Button 
            onClick={() => onStepChange(Math.min(steps.length - 1, currentStep + 1))}
            disabled={currentStep === steps.length - 1}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}