import { IntersectionType } from '@nestjs/mapped-types';

import { AddProductDto } from '../../products/dto/add-product.dto.js';
import { UpdateThresholdDto } from './update-threshold.dto.js';

export class TrackProductDto extends IntersectionType(AddProductDto, UpdateThresholdDto) {}
