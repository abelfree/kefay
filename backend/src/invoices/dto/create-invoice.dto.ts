import { Type } from 'class-transformer';
import { ArrayMinSize, IsInt, IsNumber, IsPositive, IsString, MinLength, ValidateNested } from 'class-validator';

export class CreateLineItemDto {
  @IsString()
  @MinLength(1)
  description!: string;

  @IsInt()
  @IsPositive()
  quantity!: number;

  @IsNumber()
  @IsPositive()
  unitPrice!: number;
}

export class CreateInvoiceDto {
  @IsString()
  @MinLength(1)
  number!: string;

  @IsString()
  @MinLength(1)
  customer!: string;

  @ValidateNested({ each: true })
  @Type(() => CreateLineItemDto)
  @ArrayMinSize(1)
  lineItems!: CreateLineItemDto[];
}
