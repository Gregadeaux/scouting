'use client';

import React from 'react';
import { FormSection } from '@/components/ui/FormSection';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface PhysicalSpecsSectionProps {
  // UseFormRegister from react-hook-form (accepts any form type structure)
  // Using `any` here to allow flexibility for different form data interfaces
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: any;
}

/**
 * PhysicalSpecsSection Component
 *
 * Form section for collecting physical robot specifications including:
 * - Drivetrain configuration (type, motors, programming)
 * - Physical dimensions (weight, height, width, length)
 * - Descriptions and strategy information
 *
 * Integrates with React Hook Form for form state management.
 *
 * @example
 * ```tsx
 * <PhysicalSpecsSection register={register} />
 * ```
 */
export function PhysicalSpecsSection({ register }: PhysicalSpecsSectionProps) {
  return (
    <FormSection
      title="Physical Specifications"
      description="Robot dimensions, drivetrain, and programming details"
      collapsible
      defaultOpen
    >
      {/* Drivetrain Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Drivetrain</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Input
            label="Drive Train Type"
            placeholder="e.g., Swerve, West Coast"
            {...register('drive_train')}
          />
          <Input
            label="Drive Motors"
            placeholder="e.g., 4x NEO, 6x Falcon 500"
            {...register('drive_motors')}
          />
          <Input
            label="Programming Language"
            placeholder="e.g., Java, C++, Python"
            {...register('programming_language')}
          />
        </div>
      </div>

      {/* Physical Dimensions Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Dimensions</h3>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Input
            label="Weight (lbs)"
            type="number"
            placeholder="0"
            min={0}
            max={125}
            step={0.1}
            helpText="Max: 125 lbs"
            {...register('robot_weight_lbs', { valueAsNumber: true })}
          />
          <Input
            label="Height (inches)"
            type="number"
            placeholder="0"
            min={0}
            max={78}
            step={0.1}
            helpText="Max: 78 in"
            {...register('height_inches', { valueAsNumber: true })}
          />
          <Input
            label="Width (inches)"
            type="number"
            placeholder="0"
            min={0}
            max={36}
            step={0.1}
            helpText="Max: 36 in"
            {...register('width_inches', { valueAsNumber: true })}
          />
          <Input
            label="Length (inches)"
            type="number"
            placeholder="0"
            min={0}
            max={36}
            step={0.1}
            helpText="Max: 36 in"
            {...register('length_inches', { valueAsNumber: true })}
          />
        </div>
      </div>

      {/* Descriptions and Strategy Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Description & Strategy
        </h3>

        <Textarea
          label="Physical Description"
          placeholder="Describe the robot's appearance, key mechanisms, and notable features..."
          rows={3}
          {...register('physical_description')}
        />

        <Textarea
          label="Team Strategy"
          placeholder="Describe the overall strategy and approach for this season..."
          rows={3}
          {...register('team_strategy')}
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Preferred Starting Position"
            type="number"
            placeholder="1, 2, or 3"
            min={1}
            max={3}
            step={1}
            helpText="Starting position (1-3)"
            {...register('preferred_starting_position', { valueAsNumber: true })}
          />
        </div>

        <Textarea
          label="Team Goals"
          placeholder="What are the team's goals for this season?"
          rows={2}
          {...register('team_goals')}
        />

        <Textarea
          label="Additional Comments"
          placeholder="Any other relevant information or notes..."
          rows={2}
          {...register('team_comments')}
        />
      </div>
    </FormSection>
  );
}
