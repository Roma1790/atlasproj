import { storiesOf } from "@storybook/react"
import React from "react"

import { Job } from "../redux/jobs/types"
import JobDetail from "./JobDetail"

const data: Record<string, Job> = {
  default: {
    corp: "Bosch",
    date: "20.01.2019",
    id: 1,
    lat: 50,
    logo:
      "https://connectedautomateddriving.eu/wp-content/uploads/2018/11/bosch-logo.jpg",
    lon: 11,
    score: 0.6,
    title: "System Engineer",
    type: "Full Time",
    url: "www.bosch.com",
  },
  highScore: {
    corp: "Bosch",
    date: "20.01.2019",
    id: 1,
    lat: 50,
    logo:
      "https://connectedautomateddriving.eu/wp-content/uploads/2018/11/bosch-logo.jpg",
    lon: 11,
    score: 0.9,
    title: "System Engineer",
    type: "Full Time",
    url: "www.bosch.com",
  },
  maxScore: {
    corp: "Bosch",
    date: "20.01.2019",
    id: 1,
    lat: 50,
    logo:
      "https://connectedautomateddriving.eu/wp-content/uploads/2018/11/bosch-logo.jpg",
    lon: 11,
    score: 1,
    title: "System Engineer",
    type: "Full Time",
    url: "www.bosch.com",
  },
  lowScore: {
    corp: "Bosch",
    date: "20.01.2019",
    id: 1,
    lat: 50,
    logo:
      "https://connectedautomateddriving.eu/wp-content/uploads/2018/11/bosch-logo.jpg",
    lon: 11,
    score: 0.2,
    title: "System Engineer",
    type: "Full Time",
    url: "www.bosch.com",
  },
  zeroScore: {
    corp: "Bosch",
    date: "20.01.2019",
    id: 1,
    lat: 50,
    logo:
      "https://connectedautomateddriving.eu/wp-content/uploads/2018/11/bosch-logo.jpg",
    lon: 11,
    score: 0,
    title: "System Engineer",
    type: "Full Time",
    url: "www.bosch.com",
  },
}

export const actions = {}

storiesOf("JobDetail", module)
  .addDecorator(story => <div style={{ padding: "3rem" }}>{story()}</div>)
  .add("default", () => <JobDetail job={data.default} {...actions} />)
  .add("high score", () => <JobDetail job={data.highScore} {...actions} />)
  .add("max score", () => <JobDetail job={data.maxScore} {...actions} />)
  .add("low score", () => <JobDetail job={data.lowScore} {...actions} />)
  .add("zero score", () => <JobDetail job={data.zeroScore} {...actions} />)
