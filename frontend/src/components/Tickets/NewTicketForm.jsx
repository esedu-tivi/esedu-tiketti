import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, TextField, Button, Typography, Slider } from '@mui/material'
import '../../../styles/NewTicketForm.css'

function NewTicketForm() {
  const [subject, setSubject] = useState('')
  const [device, setDevice] = useState('')
  const [description, setDescription] = useState('')
  const [additionalInfo, setAdditionalInfo] = useState('')
  const [priority, setPriority] = useState(2)
  const [formSubmitted, setFormSubmitted] = useState(false)

  const navigate = useNavigate()

  const handleSubmit = (e) => {
    e.preventDefault()
    const priorityLabel = priority === 1 ? 'low' : priority === 2 ? 'normal' : 'high'
    const newTicket = { subject, device, description, additionalInfo, priority: priorityLabel }
    console.log('Tiketti luotu?', newTicket)
    // tähän tiketin jatkotoimenpiteet
  
    setFormSubmitted(true)

    setTimeout(() => {
      navigate('/')
    }, 3000)
  }

  const handleCancel = () => {
    navigate('/')
  }

  const priorityMarks = [
    { value: 1, label: 'Matala' },
    { value: 2, label: 'Normaali' },
    { value: 3, label: 'Korkea' },
  ]

  const getSliderColor = () => {
    if (priority === 1) return { track: '#4caf50', thumb: '#2e7d32' }
    if (priority === 2) return { track: '#ffeb3b', thumb: '#fbc02d' }
    if (priority === 3) return { track: '#f44336', thumb: '#d32f2f' }
  }

  const sliderColors = getSliderColor()

  return (
    <Box className="new-ticket-form-container">
      <Typography variant="h5" gutterBottom>
        Uusi tiketti
      </Typography>
      {!formSubmitted ? (
        <form onSubmit={handleSubmit}>
          <Box className="form-field">
            <TextField
              label="Aihe"
              fullWidth
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              variant="outlined"
            />
          </Box>
          <Box className="form-field">
            <TextField
              label="Laite"
              fullWidth
              value={device}
              onChange={(e) => setDevice(e.target.value)}
              required
              variant="outlined"
            />
          </Box>
          <Box className="form-field">
            <TextField
              label="Ongelman kuvaus"
              fullWidth
              multiline
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              variant="outlined"
            />
          </Box>

          <Box className="form-field">
            <TextField
              label="Lisätiedot"
              fullWidth
              multiline
              rows={3}
              value={additionalInfo}
              onChange={(e) => setAdditionalInfo(e.target.value)}
              variant="outlined"
            />
          </Box>

          <Box className="form-field" id="slider">
            <Typography id="priority-slider" gutterBottom>
              Prioriteetti
            </Typography>
        
            <Slider
              value={priority}
              onChange={(e, value) => setPriority(value)}
              aria-labelledby="priority-slider"
              step={1}
              marks={priorityMarks}
              min={1}
              max={3}
              valueLabelDisplay="off"
              sx={{
                '& .MuiSlider-thumb': {
                  width: 24,
                  height: 24,
                  backgroundColor: sliderColors.thumb,
                  border: '2px solid white',
                  transition: 'all 0.6s ease-in-out',
                  '&:hover': {
                    boxShadow: `0 0 0 8px ${sliderColors.thumb}33`,
                  },
                },
                '& .MuiSlider-track': {
                  border: 'none',
                  height: 5,
                  backgroundColor: sliderColors.track,
                  transform: `0.6s ease-in-out`,
                  transition: 'background-color 0.6s ease-in-out',
                },
                '& .MuiSlider-rail': {
                  opacity: 0.5,
                  height: 5,
                  backgroundColor: '#bfbfbf',
                  transition: 'background-color 0.6s ease-in-out',
                },
                '& .MuiSlider-mark': {
                  display: 'none',
                },
              }}
            />
          </Box>

          <Box className="form-actions">
            <Button variant="contained" className="submit-button" type="submit" disabled={formSubmitted}>
              Luo tiketti
            </Button>
            <Button variant="outlined" className="cancel-button" onClick={handleCancel}>
              Peruuta
            </Button>
          </Box>
        </form>
      ) : (
        <Typography variant="h6" gutterBottom align="center">
          Sinne meni!
        </Typography>
      )}
    </Box>
  )
}

export default NewTicketForm
