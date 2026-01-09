/**
 * Unit Tests for Button Component
 *
 * Tests React component rendering and interactions
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '@/components/ui/button';

describe('Button Component', () => {
  describe('Rendering', () => {
    it('should render with children text', () => {
      render(<Button>Click Me</Button>);

      const button = screen.getByRole('button', { name: /click me/i });
      expect(button).toBeInTheDocument();
    });

    it('should render with default props', () => {
      render(<Button>Default Button</Button>);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveClass('bg-frc-blue'); // Primary variant default
      expect(button).toHaveClass('px-4', 'py-2'); // Medium size default
    });

    it('should render as disabled when disabled prop is true', () => {
      render(<Button disabled>Disabled Button</Button>);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveClass('disabled:opacity-50');
      expect(button).toHaveClass('disabled:cursor-not-allowed');
    });
  });

  describe('Variants', () => {
    it('should render primary variant', () => {
      render(<Button variant="primary">Primary</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-frc-blue');
      expect(button).toHaveClass('text-white');
    });

    it('should render secondary variant', () => {
      render(<Button variant="secondary">Secondary</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-gray-200');
      expect(button).toHaveClass('text-gray-900');
    });

    it('should render danger variant', () => {
      render(<Button variant="danger">Danger</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-frc-red');
      expect(button).toHaveClass('text-white');
    });

    it('should render outline variant', () => {
      render(<Button variant="outline">Outline</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('border-2');
      expect(button).toHaveClass('bg-transparent');
    });
  });

  describe('Sizes', () => {
    it('should render small size', () => {
      render(<Button size="sm">Small</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('px-3', 'py-1.5', 'text-sm');
    });

    it('should render medium size', () => {
      render(<Button size="default">Medium</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('px-4', 'py-2', 'text-base');
    });

    it('should render large size', () => {
      render(<Button size="lg">Large</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('px-6', 'py-3', 'text-lg');
    });
  });

  describe('Custom Styling', () => {
    it('should apply custom className', () => {
      render(<Button className="custom-class">Custom</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
      // Should still have base classes
      expect(button).toHaveClass('inline-flex');
    });

    it('should merge custom className with default classes', () => {
      render(
        <Button className="shadow-lg rounded-xl" variant="primary">
          Merged Classes
        </Button>
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('shadow-lg');
      expect(button).toHaveClass('rounded-xl');
      expect(button).toHaveClass('bg-frc-blue');
    });
  });

  describe('User Interactions', () => {
    it('should call onClick handler when clicked', async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();

      render(<Button onClick={handleClick}>Click Me</Button>);

      const button = screen.getByRole('button');
      await user.click(button);

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should not call onClick when disabled', async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();

      render(
        <Button onClick={handleClick} disabled>
          Disabled
        </Button>
      );

      const button = screen.getByRole('button');
      await user.click(button);

      // Click on disabled button should not trigger handler
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('should handle multiple clicks', async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();

      render(<Button onClick={handleClick}>Click Me</Button>);

      const button = screen.getByRole('button');
      await user.click(button);
      await user.click(button);
      await user.click(button);

      expect(handleClick).toHaveBeenCalledTimes(3);
    });
  });

  describe('Button Types', () => {
    it('should render with type="submit"', () => {
      render(<Button type="submit">Submit</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'submit');
    });

    it('should render with type="button" (default)', () => {
      render(<Button type="button">Button</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'button');
    });

    it('should render with type="reset"', () => {
      render(<Button type="reset">Reset</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'reset');
    });
  });

  describe('Accessibility', () => {
    it('should have proper focus styles', () => {
      render(<Button>Accessible Button</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('focus:outline-none');
      expect(button).toHaveClass('focus:ring-2');
      expect(button).toHaveClass('focus:ring-offset-2');
    });

    it('should be keyboard accessible', async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();

      render(<Button onClick={handleClick}>Keyboard Accessible</Button>);

      const button = screen.getByRole('button');
      button.focus();
      await user.keyboard('{Enter}');

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should support aria-label', () => {
      render(<Button aria-label="Close dialog">X</Button>);

      const button = screen.getByRole('button', { name: /close dialog/i });
      expect(button).toBeInTheDocument();
    });

    it('should support aria-describedby', () => {
      render(
        <>
          <Button aria-describedby="help-text">Submit</Button>
          <div id="help-text">This will submit the form</div>
        </>
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-describedby', 'help-text');
    });
  });

  describe('Complex Children', () => {
    it('should render with icon and text', () => {
      render(
        <Button>
          <span>Icon</span>
          <span>Text</span>
        </Button>
      );

      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('Icon');
      expect(button).toHaveTextContent('Text');
    });

    it('should render with nested elements', () => {
      render(
        <Button>
          <div>
            <span>Nested</span>
            <strong>Content</strong>
          </div>
        </Button>
      );

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(screen.getByText('Nested')).toBeInTheDocument();
      expect(screen.getByText('Content')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty className prop', () => {
      render(<Button className="">Button</Button>);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should handle null onClick', () => {
      render(<Button onClick={undefined}>Button</Button>);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should render with data attributes', () => {
      render(<Button data-testid="custom-button" data-tracking="click-event">Button</Button>);

      const button = screen.getByTestId('custom-button');
      expect(button).toHaveAttribute('data-tracking', 'click-event');
    });

    it('should handle form attribute', () => {
      render(<Button form="external-form">Submit External</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('form', 'external-form');
    });
  });

  describe('Snapshot-like Tests', () => {
    it('should maintain consistent class structure', () => {
      render(<Button variant="primary" size="default">Snapshot Test</Button>);

      const button = screen.getByRole('button');
      const classList = Array.from(button.classList);

      // Check for essential classes
      expect(classList).toContain('inline-flex');
      expect(classList).toContain('items-center');
      expect(classList).toContain('justify-center');
      expect(classList).toContain('font-medium');
      expect(classList).toContain('rounded-lg');
    });

    it('should maintain consistent variant classes across renders', () => {
      const { rerender } = render(<Button variant="primary">Button</Button>);
      const button1 = screen.getByRole('button');
      const classes1 = Array.from(button1.classList);

      rerender(<Button variant="primary">Button</Button>);
      const button2 = screen.getByRole('button');
      const classes2 = Array.from(button2.classList);

      expect(classes1).toEqual(classes2);
    });
  });
});
