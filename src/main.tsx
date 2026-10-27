import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App.tsx'
import { gradeRules } from './state/grade.ts'
import './styles.css'

const grades = document.createElement('style')
grades.textContent = gradeRules()
document.head.append(grades)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
