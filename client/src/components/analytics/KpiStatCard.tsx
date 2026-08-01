import React from 'react';
import StatCard, { StatCardProps } from '../common/StatCard';

export type KpiStatCardProps = StatCardProps;

export default function KpiStatCard(props: StatCardProps) {
  return <StatCard {...props} />;
}
