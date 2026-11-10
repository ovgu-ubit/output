import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { PublicationTag as IPublicationTag } from '@output/interfaces';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

@Entity('publication_tag')
export class PublicationTag implements IPublicationTag {
    @PrimaryGeneratedColumn()
    @ApiPropertyOptional()
    id?: number;

    @Column()
    @ApiProperty({ description: 'Unique, case-insensitive tag label.' })
    label: string;

    @Column({ type: 'text', nullable: true })
    @ApiPropertyOptional({ type: String, nullable: true })
    description?: string | null;

    @Column({ type: 'varchar', nullable: true })
    @ApiPropertyOptional({ type: String, nullable: true, example: '#ffcc00' })
    color?: string | null;
}
