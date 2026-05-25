import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'marginOrSize', async: false })
export class MarginOrSizeConstraint implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments): boolean {
    const o = args.object as {
      marginKc?: number;
      size?: number;
    };
    const hasMargin =
      o.marginKc != null && Number.isFinite(o.marginKc) && o.marginKc > 0;
    const hasSize = o.size != null && Number.isFinite(o.size) && o.size > 0;
    return hasMargin || hasSize;
  }

  defaultMessage(): string {
    return 'Phải nhập marginKc hoặc size (một trong hai).';
  }
}
