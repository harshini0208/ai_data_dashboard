import React from "react";
import { IDashboard, IDataset, IDatasetRecord } from "../../types";
import styles from "../../styles/Components.module.scss";
import { DropdownFilter } from "./DropdownFilter";
import { PerformanceIndicator } from "./PerformanceIndicator";
import { LineChart } from "./LineChart";
import { BarChart } from "./BarChart";
import { PieChart } from "./PieChart";
import { className } from "../../utils/className";
import { TreemapChart } from "./TreemapChart";
import { DashboardQA } from "./DashboardQA";
import { ChartTypeSelector, ChartType } from "./ChartTypeSelector";

export function Dashboard(
  props: React.PropsWithChildren<{
    dashboard: IDashboard;
    data: IDataset;
    onAskQuestion?: (question: string) => Promise<string>;
  }>
) {
  const [filters, setFilters] = React.useState<
    Pick<IDatasetRecord, keyof IDatasetRecord>
  >({});

  const [chartTypes, setChartTypes] = React.useState<{ [key: string]: ChartType }>({});

  const handleFilterChange = React.useCallback((filter: string) => {
    return (value: string) => {
      setFilters((filters) => ({ ...filters, [filter]: value }));
    };
  }, []);

  const handleChartTypeChange = React.useCallback((chartIndex: number, chartType: ChartType) => {
    setChartTypes(prev => ({
      ...prev,
      [chartIndex]: chartType
    }));
  }, []);

  const filteredData = React.useMemo(() => {
    if (Object.keys(filters).length) {
      return Object.keys(filters).reduce((result, key) => {
        if (filters[key])
          return result.filter((row) => row[key] == filters[key]);
        return result;
      }, props.data);
    }
    return props.data;
  }, [filters, props.data]);

  const dashboardContent = (
    <>
      <div className={styles.filtersRow}>
        {props.dashboard.filters.map((filter, index) => (
          <DropdownFilter
            key={`${filter.column}-${index}`}
            config={filter}
            data={props.data}
            onChange={handleFilterChange(filter.column)}
            value={filters[filter.column]}
          />
        ))}
      </div>
      <hr />
      <div className={styles.kpiRow}>
        {props.dashboard.kpis.map((filter, index) => (
          <PerformanceIndicator
            key={`${filter.title}-${index}`}
            config={filter}
            data={filteredData}
          />
        ))}
      </div>
      {props.dashboard.charts.map((chart, index) => {
        const currentChartType = chartTypes[index] || chart.chartType;
        return (
        <div
          key={`${chart.title}-${index}`}
            className={className(styles.chartCard, styles[currentChartType])}
        >
            <div className={styles.chartHeader}>
          <div className={styles.chartCardTitle}>{chart.title}</div>
              <ChartTypeSelector
                value={currentChartType}
                onChange={(type) => handleChartTypeChange(index, type)}
              />
            </div>
            {currentChartType === "lineChart" && (
            <LineChart config={chart} data={filteredData} />
          )}
            {currentChartType === "barChart" && (
            <BarChart config={chart} data={filteredData} />
          )}
            {currentChartType === "pieChart" && (
            <PieChart config={chart} data={filteredData} />
          )}
            {currentChartType === "treemapChart" && (
            <TreemapChart config={chart} data={filteredData} />
          )}
        </div>
        );
      })}
    </>
  );

  return (
    <div className={styles.dashboardContainer}>
      {props.onAskQuestion ? (
        <DashboardQA 
          data={filteredData}
          dashboard={props.dashboard}
          onAskQuestion={props.onAskQuestion}
        >
          {dashboardContent}
        </DashboardQA>
      ) : (
        dashboardContent
      )}
    </div>
  );
}
