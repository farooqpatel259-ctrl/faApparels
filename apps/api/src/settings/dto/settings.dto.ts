import { IsNotEmpty, IsString } from 'class-validator';

export class UpsertSettingDto {
  @IsString()
  @IsNotEmpty()
  key!: string;

  @IsString()
  @IsNotEmpty()
  value!: string;
}
