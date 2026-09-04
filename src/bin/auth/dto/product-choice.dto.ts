import { ArrayMinSize, IsArray, IsEnum } from 'class-validator';
import { IRequest } from '../../../common';
import { Product } from '../enum/product.enum';

export class ProductChoiceDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'Please select at least one product.' })
  @IsEnum(Product, {
    each: true,
    message: 'One or more selected products are not valid.',
  })
  products: Product[];

  req?: IRequest;
}
