import Head from "next/head";
import { stringify } from "querystring";
import React from "react";
import {
  Button,
  ButtonsRow,
  Container,
  Icon,
  Panel,
  PanelContent,
  PanelHeader,
  TextAreaInput,
  WelcomeHeader,
  SettingsModal,
  Dashboard,
  ButtonIcon,
  CodeHighlighter,
  TextInput,
  ButtonLink,
  UploadDatasetButton,
  ViewSelect,
  OpenAIErrorMessage,
  EmptyMessage,
  DataLoadedMessage,
  MissingApiKeyMessage,
} from "../components";
import { Loader } from "../components/layout/Loader";
import { Table } from "../components/layout/Table";
import { generateDashboard, generatePrompt } from "../openai";
import { getRandomDataset, sample } from "../openai/sample";
import { IDashboard, IDataset, ISettings } from "../types";
import { isDataValid, parseData, stringifyData } from "../utils/parseData";
import gtag from "../lib/gtag";
import { queryCompletionsChat } from "../openai/queryCompletionsChat";
import { getPromptModel } from "../openai/prompts";

export default function Home() {
  const [view, setView] = React.useState("dashboard");

  const [settings, setSettings] = React.useState<ISettings>({
    apikey: "",
    sampleRows: 10,
    model: ""
  });
  const [loading, setLoading] = React.useState(false);

  const [data, setData] = React.useState<IDataset>();
  const [userContext, setUserContext] = React.useState<string>("");

  const [currentSampleIndex, setCurrentSampleIndex] = React.useState(-1);
  const [dashboard, setDashboard] = React.useState<IDashboard | null>();
  const [showSettings, setShowSettings] = React.useState(false);

  React.useEffect(() => {
    const config = localStorage.getItem("analyzer-settings");
    if (config) {
      setSettings(JSON.parse(config) as ISettings);
    }
  }, []);

  const handleAnalyze = React.useCallback(() => {
    if (!settings.apikey) {
      setShowSettings(true);
    } else if (data) {
      setLoading(true);
      generateDashboard(data, userContext, settings.sampleRows, settings.apikey, settings.model)
        .then((response) => {
          setDashboard(response.dashboard);
          setLoading(false);
        })
        .catch((err) => {
          setDashboard(null);
          setLoading(false);
        });
    }
  }, [data, userContext, settings]);

  const handleRandomDataset = React.useCallback(() => {
    const { data, dashboard, context, index } =
      getRandomDataset(currentSampleIndex);
    setData(parseData(data));
    setDashboard(dashboard);
    setUserContext(context);
    setCurrentSampleIndex(index);
  }, [currentSampleIndex]);

  // console.log(dashboard, stringifyData(data || []));

  const handleClear = React.useCallback(() => {
    setData(undefined);
    setDashboard(null);
    setUserContext("");
  }, []);

  const handleSettingsChange = React.useCallback((settings: ISettings) => {
    localStorage.setItem("analyzer-settings", JSON.stringify(settings));
    setSettings(settings);
    setShowSettings(false);
  }, []);

  const handleShowSettings = React.useCallback(() => {
    setShowSettings(true);
  }, []);

  const handleCloseSettings = React.useCallback(() => {
    setShowSettings(false);
  }, []);

  const handleDatasetChange = React.useCallback((dataset: string) => {
    gtag.report("event", "upload_data", {
      event_category: "settings",
      event_label: "uploaded",
    });
    setData(parseData(dataset));
    setDashboard(null);
  }, []);

  const handleClick = React.useCallback(() => {
    setUserContext(" ");
  }, []);

  const handleClearContext = React.useCallback(() => {
    setUserContext("");
  }, []);

  const handleQuestion = React.useCallback(async (question: string) => {
    if (!data || !dashboard) return "";

    gtag.report("event", "ask_question", {
      event_category: "dashboard",
      event_label: "question_asked",
    });

    try {
      const response = await queryCompletionsChat(
        getPromptModel(settings.model),
        [
          {
            question: `Given this dashboard configuration and dataset, please answer the following question: ${question}

Dataset sample:
${stringifyData(data.slice(0, 5), ",")}

Dashboard configuration:
${JSON.stringify(dashboard, null, 2)}`,
          },
        ],
        { 
          apikey: settings.apikey, 
          model: settings.model 
        }
      );

      const answer = response?.[0].reply || "No answer available";
      return answer;
    } catch (error) {
      console.error('Error asking question:', error);
      throw new Error('Failed to get an answer. Please try again.');
    }
  }, [data, dashboard, settings]);

  return (
    <>
      <Head>
        <title>AI Data Dashboard</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* OG Meta tags */}
        <meta name="og:type" content="website" />
        <meta property="og:title" content="AI Data Dashboard" />
        <meta
          property="og:description"
          content="Visualize data with our tool created using OpenAI's GPT3 technology"
        />
        {/* Twitter Meta tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="GPT3 Data Visualization Tool" />
        <meta
          property="twitter:description"
          content="Visualize and analyze data with our app created using OpenAI's GPT3"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Container>
        <Panel>
          <PanelHeader>
            <WelcomeHeader
              title="AI Data Dashboard"
              subtitle="Upload your CSV dataset"
            />
            <ButtonIcon icon="cog" onClick={handleShowSettings} />
            {showSettings && (
              <SettingsModal
                value={settings}
                onChange={handleSettingsChange}
                onCancel={handleCloseSettings}
              />
            )}
            <ButtonsRow>
              <UploadDatasetButton onUpload={handleDatasetChange} />
              <Button
                className="trash"
                disabled={!data}
                outline
                onClick={handleClear}
              >
                <Icon icon="thrash" /> Clear
              </Button>
              <Button
                className="analyze"
                disabled={!data && !!settings?.apikey}
                onClick={handleAnalyze}
              >
                {settings?.apikey && dashboard && data ? (
                  <Icon icon="arrow" />
                ) : null}{" "}
                {(() => {
                  if (!settings.apikey) return "Set up your API KEY";
                  return dashboard && data ? "Re-analyze" : "Analyze";
                })()}
              </Button>
            </ButtonsRow>

            {userContext ? (
              <TextInput
                type="textarea"
                label={
                  <>
                    Context about the data
                    <ButtonIcon icon="thrash" onClick={handleClearContext} />
                  </>
                }
                value={userContext}
                onChange={setUserContext}
              />
            ) : (
              <ButtonLink onClick={handleClick}> + Add Context</ButtonLink>
            )}
          </PanelHeader>
          <PanelContent>
            <Table
              data={data || []}
              onChange={(newData) => {
                setData(newData);
              }}
            />
          </PanelContent>
        </Panel>
        <Panel>
          <PanelContent>
            <ViewSelect value={view} onChange={setView} />
            {!settings.apikey && !data && !dashboard ? (
              <MissingApiKeyMessage
                onApiKeyClick={handleShowSettings}
                onRandomData={handleRandomDataset}
              />
            ) : null}
            {settings.apikey && !data && !dashboard ? (
              <EmptyMessage
                onRandomData={handleRandomDataset}
                onUpload={handleDatasetChange}
              />
            ) : null}
            {settings.apikey && data && !dashboard ? (
              <DataLoadedMessage onAnalyze={handleAnalyze} />
            ) : null}
            {dashboard && data && view === "dashboard" ? (
              <Dashboard data={data} dashboard={dashboard} onAskQuestion={handleQuestion} />
            ) : null}
            {dashboard && view === "code" ? (
              <CodeHighlighter dashboard={dashboard} />
            ) : null}
            {data && view === "prompt" && (
              <TextAreaInput
                disabled
                value={generatePrompt(data, userContext, settings.sampleRows, settings.model)}
              />
            )}
          </PanelContent>
        </Panel>
      </Container>
      {loading && <Loader />}
    </>
  );
}
