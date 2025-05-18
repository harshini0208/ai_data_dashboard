import React from "react";
import styles from "../../styles/Components.module.scss";

export type ChartType = "lineChart" | "barChart" | "pieChart" | "treemapChart";

interface ChartTypeSelectorProps {
  value: ChartType;
  onChange: (type: ChartType) => void;
}

export function ChartTypeSelector({ value, onChange }: ChartTypeSelectorProps) {
  return (
    <select
      className={styles.chartTypeSelector}
      value={value}
      onChange={(e) => onChange(e.target.value as ChartType)}
    >
      <option value="lineChart">Line Chart</option>
      <option value="barChart">Bar Chart</option>
      <option value="pieChart">Pie Chart</option>
      <option value="treemapChart">Treemap Chart</option>
    </select>
  );
} 