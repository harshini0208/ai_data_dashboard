import React from "react";
import { IDataset, IKPI } from "../../types";
import styles from "../../styles/Components.module.scss";
import { parseFunc } from "../../utils/parseFunc";
import { ErrorBoundary } from "../layout/ErrorBoundary";
import { formatNumber } from "../../utils/numberFormatter";

type MetricValue = {
  value?: number;
  total?: number;
  amount?: number;
  [key: string]: any;
};

export function PerformanceIndicator(
  props: React.PropsWithChildren<{
    config: IKPI;
    data: IDataset;
  }>
) {
  const myEvalFunction = React.useMemo(() => {
    return parseFunc(props.config.javascriptFunction, (data: IDataset) => 0);
  }, [props.config]);

  const value = React.useMemo(() => {
    const val = myEvalFunction(props.data);
    if (typeof val === "object" && val !== null) {
      // If the value is an object, try to get a displayable value
      const metricVal = val as MetricValue;
      if ("value" in metricVal && typeof metricVal.value === "number") return formatNumber(metricVal.value);
      if ("total" in metricVal && typeof metricVal.total === "number") return formatNumber(metricVal.total);
      if ("amount" in metricVal && typeof metricVal.amount === "number") return formatNumber(metricVal.amount);
      // Convert object to string if no numeric value found
      return JSON.stringify(val);
    }
    if (typeof val === "number") return formatNumber(val);
    return val;
  }, [myEvalFunction, props.data]);

  return (
    <ErrorBoundary>
      <div className={styles.performanceIndicator}>
        <div className={styles.label}>
          {props.config.title.replace("Average", "Avg.")}
        </div>
        <div className={styles.value}>{value}</div>
      </div>
    </ErrorBoundary>
  );
}
