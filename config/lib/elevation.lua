local math = math

module "Elevation"

function slope_speed(way_info, base_speed, forward)
    local distance
    local climb_distance
    local desc_distance
    local climb_factor
    local desc_factor

    distance = way_info["distance"]

    if forward then
        climb_distance = way_info["climbDistance"]
        desc_distance = way_info["descentDistance"]
        climb_factor = climb_distance / distance
        desc_factor = desc_distance / distance
        climb = way_info["climb"]
        descent = way_info["descent"]
    else
        desc_distance = way_info["climbDistance"]
        climb_distance = way_info["descentDistance"]
        desc_factor = climb_distance / distance
        climb_factor = desc_distance / distance
        descent = way_info["climb"]
        climb = way_info["descent"]
    end

    local remain_factor = 1 - (climb_factor + desc_factor)
    local climb_gradient = climb / climb_distance * 1000
    local desc_gradient = -descent / desc_distance * 1000

    return base_speed * remain_factor + speed(climb_gradient, base_speed) * climb_factor + speed(desc_gradient, base_speed) * desc_factor
end

function speed(g, base_speed)
   if g>0 then
      return math.max(3,base_speed-100*g)
   else
      return math.min(50,base_speed-50*g)
   end
end
